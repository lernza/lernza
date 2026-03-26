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
import { getServer, signAndSubmit } from "./client"
import { getNetworkConfig } from "@/lib/network"

export class RewardsClient {
  private getContract(): Contract {
    const id = getNetworkConfig().rewardsContractId
    if (!id) throw new Error("Rewards contract not configured. Set VITE_REWARDS_CONTRACT_ID.")
    try {
      return new Contract(id)
    } catch {
      throw new Error(`Invalid rewards contract ID: "${id}"`)
    }
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
    } catch (e) {
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

export const rewardsClient = new RewardsClient()
