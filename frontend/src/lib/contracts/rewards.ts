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

const CONTRACT_ID = import.meta.env.VITE_REWARDS_CONTRACT_ID || ""

export class RewardsClient {
  private contract: Contract

  constructor() {
    this.contract = new Contract(CONTRACT_ID)
  }

  // --- Read Operations ---

  async getPoolBalance(questId: number): Promise<bigint> {
    const result = await this.invokeRead("get_pool_balance", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    return result ? BigInt(result) : 0n
  }

  async getUserEarnings(user: string): Promise<bigint> {
    const result = await this.invokeRead("get_user_earnings", [new Address(user).toScVal()])
    return result ? BigInt(result) : 0n
  }

  async getTotalDistributed(): Promise<bigint> {
    const result = await this.invokeRead("get_total_distributed", [])
    return result ? BigInt(result) : 0n
  }

  // --- Write Operations ---

  async initialize(owner: string, tokenAddr: string) {
    const tx = await this.buildTx(owner, "initialize", [new Address(tokenAddr).toScVal()])
    return signAndSubmit(tx)
  }

  async fundQuest(funder: string, questId: number, amount: bigint) {
    const tx = await this.buildTx(funder, "fund_quest", [
      new Address(funder).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(amount, { type: "i128" }),
    ])
    return signAndSubmit(tx)
  }

  async distributeReward(
    authority: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    amount: bigint
  ) {
    const tx = await this.buildTx(authority, "distribute_reward", [
      new Address(authority).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
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
        .addOperation(this.contract.call(method, ...args))
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
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build()

    return await server.prepareTransaction(tx)
  }
}

export const rewardsClient = new RewardsClient()
