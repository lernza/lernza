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
import type { TransactionResult } from "./client"
import { server, signAndSubmit, NETWORK_PASSPHRASE } from "./client"

const CONTRACT_ID = import.meta.env.VITE_MILESTONE_CONTRACT_ID || ""

export interface MilestoneInfo {
  id: number
  questId: number
  title: string
  description: string
  rewardAmount: bigint
  requiresPrevious: boolean
}

export interface VerifyCompletionResult extends TransactionResult {
  rewardAmount?: bigint
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return BigInt(value)
  if (typeof value === "string" && value.length > 0) return BigInt(value)
  return 0n
}

export class MilestoneClient {
  private contract: Contract | null

  constructor() {
    if (CONTRACT_ID) {
      try {
        this.contract = new Contract(CONTRACT_ID)
      } catch {
        this.contract = null
        console.error(`[MilestoneClient] Invalid VITE_MILESTONE_CONTRACT_ID: "${CONTRACT_ID}"`)
      }
    } else {
      this.contract = null
    }
  }

  private getContract(): Contract {
    if (!this.contract)
      throw new Error("Milestone contract not configured. Set VITE_MILESTONE_CONTRACT_ID.")
    return this.contract
  }

  // --- Read Operations ---

  async getMilestone(questId: number, milestoneId: number): Promise<MilestoneInfo | null> {
    const result = await this.invokeRead("get_milestone", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
    ])
    return result ? this.parseMilestoneInfo(result) : null
  }

  async getMilestones(questId: number): Promise<MilestoneInfo[]> {
    const result = await this.invokeRead("list_milestones", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    if (!Array.isArray(result)) return []
    return result.map(raw => this.parseMilestoneInfo(raw))
  }

  async listMilestones(questId: number): Promise<MilestoneInfo[]> {
    return this.getMilestones(questId)
  }

  async getMilestoneCount(questId: number): Promise<number> {
    const result = await this.invokeRead("get_milestone_count", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    return result ? Number(result) : 0
  }

  async isCompleted(questId: number, milestoneId: number, user: string): Promise<boolean> {
    const result = await this.invokeRead("is_completed", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(user).toScVal(),
    ])
    return !!result
  }

  async getEnrolleeCompletions(questId: number, enrollee: string): Promise<number> {
    const result = await this.invokeRead("get_enrollee_completions", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    return result ? Number(result) : 0
  }

  // --- Write Operations ---

  async createMilestone(
    owner: string,
    questId: number,
    title: string,
    description: string,
    rewardAmount: bigint,
    requiresPrevious = false
  ) {
    const tx = await this.buildTx(owner, "create_milestone", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(title, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(rewardAmount, { type: "i128" }),
      nativeToScVal(requiresPrevious, { type: "bool" }),
    ])
    return signAndSubmit(tx)
  }

  async verifyCompletion(
    owner: string,
    questId: number,
    milestoneId: number,
    enrollee: string
  ): Promise<VerifyCompletionResult> {
    const tx = await this.buildTx(owner, "verify_completion", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    const result = await signAndSubmit(tx)
    return {
      ...result,
      rewardAmount: this.parseNumericResult(result.resultXdr),
    }
  }

  // --- Private Helpers ---

  private parseMilestoneInfo(raw: unknown): MilestoneInfo {
    const record = raw as Record<string, unknown>
    return {
      id: Number(record.id),
      questId: Number(record.quest_id),
      title: String(record.title),
      description: String(record.description),
      rewardAmount: toBigInt(record.reward_amount),
      requiresPrevious: Boolean(record.requires_previous),
    }
  }

  private parseNumericResult(resultXdr?: string): bigint | undefined {
    if (!resultXdr) return undefined

    try {
      const value = scValToNative(xdr.ScVal.fromXDR(resultXdr, "base64"))
      return toBigInt(value)
    } catch {
      return undefined
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
}

export const milestoneClient = new MilestoneClient()
