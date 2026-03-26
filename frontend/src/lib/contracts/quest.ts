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
import { server, signAndSubmit, NETWORK_PASSPHRASE } from "./client"

const CONTRACT_ID = import.meta.env.VITE_QUEST_CONTRACT_ID || ""

export interface QuestInfo {
  id: number
  owner: string
  name: string
  description: string
  tokenAddr: string
  createdAt: number
}

export class QuestClient {
  private contract: Contract | null

  constructor() {
    this.contract = CONTRACT_ID ? new Contract(CONTRACT_ID) : null
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

    return {
      id: Number(result.id),
      owner: result.owner.toString(),
      name: result.name.toString(),
      description: result.description.toString(),
      tokenAddr: result.token_addr.toString(),
      createdAt: Number(result.created_at),
    }
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

  // --- Write Operations ---

  async createQuest(owner: string, name: string, description: string, tokenAddr: string) {
    const tx = await this.buildTx(owner, "create_quest", [
      new Address(owner).toScVal(),
      nativeToScVal(name, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      new Address(tokenAddr).toScVal(),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Adds an enrollee to a quest.
   * Note: This must be signed by the QUEST OWNER, not the enrollee.
   */
  async addEnrollee(owner: string, questId: number, enrollee: string) {
    const tx = await this.buildTx(owner, "add_enrollee", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    return signAndSubmit(tx)
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
