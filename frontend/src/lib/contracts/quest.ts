import {
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  Keypair,
  Account,
} from "@stellar/stellar-sdk"
import type { xdr } from "@stellar/stellar-sdk"
import { getServer, signAndSubmit } from "./client"
import { getNetworkConfig } from "@/lib/network"

export const Visibility = {
  Public: 0,
  Private: 1,
} as const
export type Visibility = (typeof Visibility)[keyof typeof Visibility]

export const QuestStatus = {
  Active: 0,
  Archived: 1,
} as const
export type QuestStatus = (typeof QuestStatus)[keyof typeof QuestStatus]

export interface QuestInfo {
  id: number
  owner: string
  name: string
  description: string
  category: string
  tags: string[]
  tokenAddr: string
  createdAt: number
  visibility: Visibility
  status: QuestStatus
  deadline: number
}

export class QuestClient {
  private getContract(): Contract {
    const id = getNetworkConfig().questContractId
    if (!id) throw new Error("Quest contract not configured. Set VITE_QUEST_CONTRACT_ID.")
    try {
      return new Contract(id)
    } catch {
      throw new Error(`Invalid quest contract ID: "${id}"`)
    }
  }

  // --- Read Operations ---

  async getQuest(questId: number): Promise<QuestInfo | null> {
    const result = await this.invokeRead("get_quest", [nativeToScVal(questId, { type: "u32" })])
    if (!result) return null
    return this.parseQuestInfo(result)
  }

  async getQuests(): Promise<QuestInfo[]> {
    const count = await this.getQuestCount()
    const quests: QuestInfo[] = []
    for (let i = 0; i < count; i++) {
      const q = await this.getQuest(i)
      if (q) quests.push(q)
    }
    return quests
  }

  async getQuestCount(): Promise<number> {
    const result = await this.invokeRead("get_quest_count", [])
    return result ? Number(result) : 0
  }

  async getEnrollees(questId: number): Promise<string[]> {
    const result = await this.invokeRead("get_enrollees", [nativeToScVal(questId, { type: "u32" })])
    return result || []
  }

  async isEnrollee(questId: number, user: string): Promise<boolean> {
    const result = await this.invokeRead("is_enrollee", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(user).toScVal(),
    ])
    return !!result
  }

  /**
   * Returns all public quests (paginated).
   */
  async listPublicQuests(start: number, limit: number): Promise<QuestInfo[]> {
    const result = await this.invokeRead("list_public_quests", [
      nativeToScVal(start, { type: "u32" }),
      nativeToScVal(limit, { type: "u32" }),
    ])
    if (!Array.isArray(result)) return []
    return result.map((r: unknown) => this.parseQuestInfo(r))
  }

  /**
   * Returns all public quests within a category.
   */
  async getQuestsByCategory(category: string): Promise<QuestInfo[]> {
    const result = await this.invokeRead("get_quests_by_category", [
      nativeToScVal(category, { type: "string" }),
    ])
    if (!Array.isArray(result)) return []
    return result.map((r: unknown) => this.parseQuestInfo(r))
  }

  /**
   * Returns the enrollment cap for a quest, or null if uncapped.
   */
  async getEnrollmentCap(questId: number): Promise<number | null> {
    const result = await this.invokeRead("get_enrollment_cap", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    return result != null ? Number(result) : null
  }

  /**
   * Returns true if the quest has a non-zero deadline that has passed.
   */
  async isExpired(questId: number): Promise<boolean> {
    const result = await this.invokeRead("is_expired", [nativeToScVal(questId, { type: "u32" })])
    return !!result
  }

  // --- Write Operations ---

  /**
   * Creates a new quest. Returns the quest ID.
   */
  async createQuest(
    owner: string,
    name: string,
    description: string,
    category: string,
    tags: string[],
    tokenAddr: string,
    visibility: Visibility
  ) {
    const tx = await this.buildTx(owner, "create_quest", [
      new Address(owner).toScVal(),
      nativeToScVal(name, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(category, { type: "string" }),
      nativeToScVal(tags, { type: "array" }),
      new Address(tokenAddr).toScVal(),
      nativeToScVal(visibility, { type: "u32" }),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Updates quest details. Owner only. Quest must be active.
   */
  async updateQuest(
    owner: string,
    questId: number,
    name: string,
    description: string,
    category: string,
    tags: string[],
    visibility: Visibility
  ) {
    const tx = await this.buildTx(owner, "update_quest", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(name, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(category, { type: "string" }),
      nativeToScVal(tags, { type: "array" }),
      nativeToScVal(visibility, { type: "u32" }),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Archives a quest. Owner only.
   * Archived quests remain readable but do not accept new enrollments.
   */
  async archiveQuest(owner: string, questId: number) {
    const tx = await this.buildTx(owner, "archive_quest", [nativeToScVal(questId, { type: "u32" })])
    return signAndSubmit(tx)
  }

  /**
   * Adds an enrollee to a quest.
   * Note: This must be signed by the QUEST OWNER, not the enrollee.
   * Will fail with QuestArchived if the quest has been archived.
   */
  async addEnrollee(owner: string, questId: number, enrollee: string) {
    const tx = await this.buildTx(owner, "add_enrollee", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Removes an enrollee from a quest. Owner only.
   */
  async removeEnrollee(owner: string, questId: number, enrollee: string) {
    const tx = await this.buildTx(owner, "remove_enrollee", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Allows an enrollee to unenroll themselves.
   * Must be signed by the enrollee.
   */
  async leaveQuest(enrollee: string, questId: number) {
    const tx = await this.buildTx(enrollee, "leave_quest", [
      new Address(enrollee).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Sets visibility for a quest. Owner only.
   */
  async setVisibility(owner: string, questId: number, visibility: Visibility) {
    const tx = await this.buildTx(owner, "set_visibility", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(visibility, { type: "u32" }),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Sets or clears the deadline for a quest. Owner only.
   * Pass 0 to remove the deadline.
   */
  async setDeadline(owner: string, questId: number, deadline: number) {
    const tx = await this.buildTx(owner, "set_deadline", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(deadline, { type: "u64" }),
    ])
    return signAndSubmit(tx)
  }

  // --- Private Helpers ---

  private parseQuestInfo(raw: unknown): QuestInfo {
    const r = raw as Record<string, unknown>
    return {
      id: Number(r.id),
      owner: String(r.owner),
      name: String(r.name),
      description: String(r.description),
      category: String(r.category),
      tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map(String) : [],
      tokenAddr: String(r.token_addr),
      createdAt: Number(r.created_at),
      visibility: Number(r.visibility) as Visibility,
      status: Number(r.status) as QuestStatus,
      deadline: Number(r.deadline),
    }
  }

  private async invokeRead(method: string, args: xdr.ScVal[]) {
    try {
      const randomKP = Keypair.random()
      const account = new Account(randomKP.publicKey(), "0")
      const { passphrase } = getNetworkConfig()

      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: passphrase,
      })
        .addOperation(this.getContract().call(method, ...args))
        .setTimeout(30)
        .build()

      const response = await getServer().simulateTransaction(tx)

      if (response && "result" in response && response.result) {
        return scValToNative(response.result.retval)
      }
    } catch (e: unknown) {
      console.error(`Read error ${method}:`, e)
    }
    return null
  }

  private async buildTx(source: string, method: string, args: xdr.ScVal[]) {
    const srv = getServer()
    const { passphrase } = getNetworkConfig()
    const account = await srv.getAccount(source)

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: passphrase,
    })
      .addOperation(this.getContract().call(method, ...args))
      .setTimeout(30)
      .build()

    return await srv.prepareTransaction(tx)
  }
}

export const questClient = new QuestClient()
