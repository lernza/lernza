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
import type { TransactionResult } from "./client"
import { server, signAndSubmit, NETWORK_PASSPHRASE } from "./client"

const CONTRACT_ID = import.meta.env.VITE_QUEST_CONTRACT_ID || ""

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
  maxEnrollees?: number
  verified: boolean
}

export class QuestClient {
  private contract: Contract | null

  constructor() {
    if (CONTRACT_ID) {
      try {
        this.contract = new Contract(CONTRACT_ID)
      } catch {
        this.contract = null
        console.error(`[QuestClient] Invalid VITE_QUEST_CONTRACT_ID: "${CONTRACT_ID}"`)
      }
    } else {
      this.contract = null
    }
  }

  private getContract(): Contract {
    if (!this.contract)
      throw new Error("Quest contract not configured. Set VITE_QUEST_CONTRACT_ID.")
    return this.contract
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

  async isCreatorVerified(creator: string): Promise<boolean> {
    const result = await this.invokeRead("is_creator_verified", [
      new Address(creator).toScVal(),
    ])
    return !!result
  }

  async verifyCreator(admin: string, creator: string) {
    const tx = await this.buildTx(admin, "verify_creator", [
      new Address(admin).toScVal(),
      new Address(creator).toScVal(),
    ])
    return signAndSubmit(tx)
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
    visibility: Visibility,
    maxEnrollees?: number
  ) {
    const tx = await this.buildTx(owner, "create_quest", [
      new Address(owner).toScVal(),
      nativeToScVal(name, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(category, { type: "string" }),
      nativeToScVal(tags, { type: "string_vec" }),
      new Address(tokenAddr).toScVal(),
      nativeToScVal(visibility, { type: "u32" }),
      maxEnrollees !== undefined
        ? nativeToScVal(maxEnrollees, { type: "u32" })
        : nativeToScVal(null),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Updates quest details. Owner only. Quest must be active.
   */
  async updateQuest(
    owner: string,
    questId: number,
    name?: string,
    description?: string,
    category?: string,
    tags?: string[],
    visibility?: Visibility,
    maxEnrollees?: number
  ) {
    const tx = await this.buildTx(owner, "update_quest", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(owner).toScVal(),
      name !== undefined ? nativeToScVal(name, { type: "string" }) : nativeToScVal(null),
      description !== undefined
        ? nativeToScVal(description, { type: "string" })
        : nativeToScVal(null),
      category !== undefined ? nativeToScVal(category, { type: "string" }) : nativeToScVal(null),
      tags !== undefined ? nativeToScVal(tags, { type: "string_vec" }) : nativeToScVal(null),
      visibility !== undefined ? nativeToScVal(visibility, { type: "u32" }) : nativeToScVal(null),
      maxEnrollees !== undefined
        ? nativeToScVal(maxEnrollees, { type: "u32" })
        : nativeToScVal(null),
    ])
    return signAndSubmit(tx)
  }

  // updateQuest was replaced by the more flexible version above

  /**
   * Archives a quest. Owner only.
   * Archived quests remain readable but do not accept new enrollments.
   */
  async archiveQuest(owner: string, questId: number) {
    const tx = await this.buildTx(owner, "archive_quest", [nativeToScVal(questId, { type: "u32" })])
    return signAndSubmit(tx)
  }

  /**
   * Adds an enrollee to a quest as the owner, or self-enrolls a learner into a public quest.
   */
  async addEnrollee(owner: string, questId: number, enrollee: string): Promise<TransactionResult>
  async addEnrollee(questId: number, enrollee: string): Promise<TransactionResult>
  async addEnrollee(
    ownerOrQuestId: string | number,
    questIdOrEnrollee: number | string,
    maybeEnrollee?: string
  ) {
    if (typeof ownerOrQuestId === "number" && typeof questIdOrEnrollee === "string") {
      return this.joinQuest(questIdOrEnrollee, ownerOrQuestId)
    }

    const owner = ownerOrQuestId as string
    const questId = questIdOrEnrollee as number
    const enrollee = maybeEnrollee

    if (!enrollee) {
      throw new Error("Missing enrollee address.")
    }

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
   * Allows a learner to enroll themselves in a public quest.
   */
  async joinQuest(enrollee: string, questId: number) {
    const tx = await this.buildTx(enrollee, "join_quest", [
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
      maxEnrollees: r.max_enrollees ? Number(r.max_enrollees) : undefined,
      verified: !!r.verified,
    }
  }

  private async invokeRead(method: string, args: xdr.ScVal[]) {
    try {
      const randomKP = Keypair.random()
      const account = new Account(randomKP.publicKey(), "0")

      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(this.getContract().call(method, ...args))
        .setTimeout(30)
        .build()

      const response = await server.simulateTransaction(tx)

      if (response && "result" in response && response.result) {
        return scValToNative(response.result.retval)
      }
    } catch (e: unknown) {
      console.error(`Read error ${method}:`, e)
    }
    return null
  }

  private async buildTx(source: string, method: string, args: xdr.ScVal[]) {
    const account = await server.getAccount(source)

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(this.getContract().call(method, ...args))
      .setTimeout(30)
      .build()

    return await server.prepareTransaction(tx)
  }
}

export const questClient = new QuestClient()
