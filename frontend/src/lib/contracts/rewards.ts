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
import {
  server,
  signAndSubmit,
  NETWORK_PASSPHRASE,
  type TransactionLifecycleHandlers,
} from "./client"
import type { PoolBalance, UserEarnings, TotalDistributed } from "../contract-types"

const CONTRACT_ID = import.meta.env.VITE_REWARDS_CONTRACT_ID || ""

export class RewardsClient {
  private contract: Contract | null

  constructor() {
    if (CONTRACT_ID) {
      try {
        this.contract = new Contract(CONTRACT_ID)
      } catch {
        this.contract = null
        console.error(`[RewardsClient] Invalid VITE_REWARDS_CONTRACT_ID: "${CONTRACT_ID}"`)
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

  // --- Write Operations ---

  async initialize(owner: string, tokenAddr: string, handlers?: TransactionLifecycleHandlers) {
    const tx = await this.buildTx(owner, "initialize", [new Address(tokenAddr).toScVal()])
    return signAndSubmit(tx, handlers)
  }

  async fundQuest(
    funder: string,
    questId: number,
    amount: bigint,
    handlers?: TransactionLifecycleHandlers
  ) {
    const tx = await this.buildTx(funder, "fund_quest", [
      new Address(funder).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(amount, { type: "i128" }),
    ])
    return signAndSubmit(tx, handlers)
  }

  async distributeReward(
    authority: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    amount: bigint,
    handlers?: TransactionLifecycleHandlers
  ) {
    const tx = await this.buildTx(authority, "distribute_reward", [
      new Address(authority).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
    ])
    return signAndSubmit(tx, handlers)
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
}

export const rewardsClient = new RewardsClient()
