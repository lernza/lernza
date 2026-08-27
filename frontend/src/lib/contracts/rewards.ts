/** Soroban contract client for the Lernza rewards system (claim, distribute, track). */
import { isDev } from "@/lib/env"
import { Address, Contract, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk"
import {
  signAndSubmitTracked,
  simulateContractRead,
  prepareContractTransaction,
  type TransactionLifecycleHandlers,
} from "./client"
import type { PoolBalance, UserEarnings, TotalDistributed } from "../contract-types"
import { safeContractCall } from "../error-utils"
import { withContractLogging } from "./logger"
import { contractAddresses } from "./config"

const CONTRACT_ID = contractAddresses.rewards

export class RewardsClient {
  private contract: Contract | null

  constructor() {
    if (CONTRACT_ID) {
      try {
        this.contract = new Contract(CONTRACT_ID)
      } catch {
        this.contract = null
        if (isDev) {
          console.error(`[RewardsClient] Invalid VITE_REWARDS_CONTRACT_ID: "${CONTRACT_ID}"`)
        }
      }
    } else {
      this.contract = null
    }
  }

  private getContract(): Contract {
    if (!this.contract)
      throw new Error("Rewards contract not configured. Set VITE_REWARDS_CONTRACT_ID.")
    return this.contract
  }

  // --- Read Operations ---

  async getPoolBalance(questId: number): Promise<PoolBalance> {
    const result = await this.invokeRead("get_pool_balance", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    return result ? BigInt(result) : 0n
  }

  async getUserEarnings(user: string): Promise<UserEarnings> {
    const result = await this.invokeRead("get_user_earnings", [new Address(user).toScVal()])
    return result ? BigInt(result) : 0n
  }

  async getTotalDistributed(): Promise<TotalDistributed> {
    const result = await this.invokeRead("get_total_distributed", [])
    return result ? BigInt(result) : 0n
  }

  async getPlatformStats(): Promise<{
    totalFundedQuests: number
    totalFunded: bigint
    totalDistributed: bigint
  }> {
    const result = await this.invokeRead("get_platform_stats", [])
    if (!result) return { totalFundedQuests: 0, totalFunded: 0n, totalDistributed: 0n }
    const native = scValToNative(result)
    if (Array.isArray(native) && native.length === 3) {
      return {
        totalFundedQuests: Number(native[0]),
        totalFunded: BigInt(native[1]),
        totalDistributed: BigInt(native[2]),
      }
    }
    return { totalFundedQuests: 0, totalFunded: 0n, totalDistributed: 0n }
  }

  async getQuestAuthority(questId: number): Promise<string | null> {
    const result = await this.invokeRead("get_quest_authority", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    if (!result) return null
    const native = scValToNative(result)
    return typeof native === "string" ? native : null
  }

  // --- Write Operations ---

  async initialize(owner: string, tokenAddr: string, handlers?: TransactionLifecycleHandlers) {
    return safeContractCall(async () => {
      const tx = await this.buildTx(owner, "initialize", [new Address(tokenAddr).toScVal()])
      return signAndSubmitTracked(tx, "Initialize Rewards Pool", handlers)
    })
  }

  async fundQuest(
    funder: string,
    questId: number,
    amount: bigint,
    handlers?: TransactionLifecycleHandlers
  ) {
    return safeContractCall(async () => {
      const tx = await this.buildTx(funder, "fund_quest", [
        new Address(funder).toScVal(),
        nativeToScVal(questId, { type: "u32" }),
        nativeToScVal(amount, { type: "i128" }),
      ])
      return signAndSubmitTracked(tx, "Fund Quest", handlers)
    })
  }

  async distributeReward(
    authority: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    amount: bigint,
    handlers?: TransactionLifecycleHandlers
  ) {
    return safeContractCall(async () => {
      const tx = await this.buildTx(authority, "distribute_reward", [
        new Address(authority).toScVal(),
        nativeToScVal(questId, { type: "u32" }),
        nativeToScVal(milestoneId, { type: "u32" }),
        new Address(enrollee).toScVal(),
        nativeToScVal(amount, { type: "i128" }),
      ])
      return signAndSubmitTracked(tx, "Distribute Reward", handlers)
    })
  }

  async refundPool(
    authority: string,
    questId: number,
    amount: bigint,
    handlers?: TransactionLifecycleHandlers
  ) {
    return safeContractCall(async () => {
      const tx = await this.buildTx(authority, "refund_pool", [
        new Address(authority).toScVal(),
        nativeToScVal(questId, { type: "u32" }),
        nativeToScVal(amount, { type: "i128" }),
      ])
      return signAndSubmitTracked(tx, "Refund Pool", handlers)
    })
  }

  // --- Private Helpers ---

  private async invokeRead(method: string, args: xdr.ScVal[]) {
    return withContractLogging("rewards", method, {}, async () => {
      return simulateContractRead(this.getContract(), { method, args })
    }).catch((e: unknown) => {
      if (isDev) {
        console.error(`Read error ${method}:`, e)
      }
      return null
    })
  }

  private async buildTx(source: string, method: string, args: xdr.ScVal[]) {
    return prepareContractTransaction(this.getContract(), source, { method, args })
  }
}

export const rewardsClient = new RewardsClient()
