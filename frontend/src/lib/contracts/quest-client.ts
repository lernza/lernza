import {
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
  TransactionBuilder,
  Keypair,
  Account,
} from "@stellar/stellar-sdk"
import { server, signAndSubmit, NETWORK_PASSPHRASE } from "./client"
import type { QuestInfo, Visibility } from "../contract-types"
import { safeContractCall } from "../error-utils"

const CONTRACT_ID = import.meta.env.VITE_QUEST_CONTRACT_ID || ""

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
    return result ? this.parseQuestInfo(result) : null
  }

  async listPublicQuests(start: number, limit: number): Promise<QuestInfo[]> {
    const result = await this.invokeRead("list_public_quests", [
      nativeToScVal(start, { type: "u32" }),
      nativeToScVal(limit, { type: "u32" }),
    ])
    return result ? result.map((q: unknown) => this.parseQuestInfo(q)) : []
  }

  async getEnrollees(questId: number): Promise<string[]> {
    const result = await this.invokeRead("get_enrollees", [nativeToScVal(questId, { type: "u32" })])
    return result || []
  }

  // --- Write Operations ---

  async createQuest(
    owner: string,
    name: string,
    description: string,
    category: string,
    tags: string[],
    tokenAddr: string,
    deadline: number,
    visibility: Visibility,
    maxEnrollees?: number
  ) {
    return safeContractCall(async () => {
      const args = [
        new Address(owner).toScVal(),
        nativeToScVal(name, { type: "string" }),
        nativeToScVal(description, { type: "string" }),
        nativeToScVal(category, { type: "string" }),
        nativeToScVal(tags, { type: "Vec" }),
        new Address(tokenAddr).toScVal(),
        nativeToScVal(deadline, { type: "u64" }),
        nativeToScVal(visibility, { type: "u32" }),
      ]

      if (maxEnrollees !== undefined) {
        args.push(nativeToScVal(maxEnrollees, { type: "u32" }))
      }

      const tx = await this.buildTx(owner, "create_quest", args)
      return signAndSubmit(tx)
    })
  }

  async addEnrollee(owner: string, questId: number, enrollee: string) {
    return safeContractCall(async () => {
      const tx = await this.buildTx(owner, "add_enrollee", [
        nativeToScVal(questId, { type: "u32" }),
        new Address(enrollee).toScVal(),
      ])
      return signAndSubmit(tx)
    })
  }

  async removeEnrollee(owner: string, questId: number, enrollee: string) {
    return safeContractCall(async () => {
      const tx = await this.buildTx(owner, "remove_enrollee", [
        nativeToScVal(questId, { type: "u32" }),
        new Address(enrollee).toScVal(),
      ])
      return signAndSubmit(tx)
    })
  }

  async setVisibility(owner: string, questId: number, visibility: Visibility) {
    return safeContractCall(async () => {
      const tx = await this.buildTx(owner, "set_visibility", [
        nativeToScVal(questId, { type: "u32" }),
        nativeToScVal(visibility, { type: "u32" }),
      ])
      return signAndSubmit(tx)
    })
  }

  // --- Private Helpers ---

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
    } catch (e) {
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

  private parseQuestInfo(raw: Record<string, unknown>): QuestInfo {
    return {
      id: raw.id,
      owner: raw.owner,
      name: raw.name,
      description: raw.description,
      category: raw.category,
      tags: raw.tags || [],
      tokenAddr: raw.token_addr,
      createdAt: raw.created_at,
      visibility: raw.visibility,
      status: raw.status,
      deadline: raw.deadline,
      maxEnrollees: raw.max_enrollees,
    }
  }
}

export const questClient = new QuestClient()
