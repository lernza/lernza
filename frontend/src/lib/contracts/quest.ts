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
  visibility: number
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
      visibility: Number(result.visibility ?? 0),
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

  async createQuest(
    owner: string,
    name: string,
    description: string,
    category: string,
    tags: string[],
    tokenAddr: string,
    visibility: number
  ) {
    const tx = await this.buildTx(owner, "create_quest", [
      new Address(owner).toScVal(),
      nativeToScVal(name, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(category, { type: "string" }),
      nativeToScVal(tags, { type: "string" }),
      new Address(tokenAddr).toScVal(),
      nativeToScVal(visibility, { type: "u32" }),
    ])
    return signAndSubmit(tx)
  }

  /**
   * Adds an enrollee to a quest.
   *
   * Supported call signatures:
   * - addEnrollee(signer, questId, enrollee): owner-invite flow
   * - addEnrollee(questId, enrollee): self-enrollment flow
   */
  async addEnrollee(arg1: string | number, arg2: number | string, arg3?: string) {
    const ownerInviteFlow = typeof arg1 === "string" && typeof arg2 === "number" && !!arg3
    const selfEnrollFlow = typeof arg1 === "number" && typeof arg2 === "string" && !arg3

    if (!ownerInviteFlow && !selfEnrollFlow) {
      throw new Error("Invalid addEnrollee arguments")
    }

    const signer = ownerInviteFlow ? arg1 : (arg2 as string)
    const questId = ownerInviteFlow ? (arg2 as number) : (arg1 as number)
    const enrollee = ownerInviteFlow ? (arg3 as string) : (arg2 as string)

    const tx = await this.buildTx(signer, "add_enrollee", [
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
        .addOperation(this.contract!.call(method, ...args))
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
      .addOperation(this.contract!.call(method, ...args))
      .setTimeout(30)
      .build()

    return await server.prepareTransaction(tx)
  }
}

export const questClient = new QuestClient()
