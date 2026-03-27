import {
  Contract,
  scValToNative,
  xdr,
  Keypair,
  Account,
  TransactionBuilder,
} from "@stellar/stellar-sdk"
import { server, NETWORK_PASSPHRASE } from "./client"

export interface TokenMetadata {
  symbol: string
  decimals: number
  name: string
}

export class TokenClient {
  private contract: Contract | null
  private cache: Map<string, TokenMetadata> = new Map()

  constructor(tokenAddress: string) {
    if (tokenAddress) {
      try {
        this.contract = new Contract(tokenAddress)
      } catch {
        this.contract = null
        console.error(`[TokenClient] Invalid token address: "${tokenAddress}"`)
      }
    } else {
      this.contract = null
    }
  }

  private getContract(): Contract {
    if (!this.contract) {
      throw new Error("Token contract not configured.")
    }
    return this.contract
  }

  /**
   * Fetch token metadata from SAC contract
   */
  async getTokenMetadata(): Promise<TokenMetadata> {
    const tokenAddress = this.getContractAddress()

    // Check cache first
    if (this.cache.has(tokenAddress)) {
      return this.cache.get(tokenAddress)!
    }

    try {
      // Use server to simulate the transaction and get results
      const randomKP = Keypair.random()
      const account = new Account(randomKP.publicKey(), "0")

      // Build transaction to call symbol
      const txSymbol = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(this.getContract().call("symbol"))
        .setTimeout(30)
        .build()

      // Build transaction to call decimal
      const txDecimal = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(this.getContract().call("decimal"))
        .setTimeout(30)
        .build()

      // Build transaction to call name
      const txName = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(this.getContract().call("name"))
        .setTimeout(30)
        .build()

      // Simulate transactions to get results
      const [symbolResult, decimalsResult, nameResult] = await Promise.all([
        server.simulateTransaction(txSymbol),
        server.simulateTransaction(txDecimal),
        server.simulateTransaction(txName),
      ])

      // Extract values from simulation results
      const symbol = symbolResult.results?.[0]
        ? (scValToNative(xdr.ScVal.fromXDR(symbolResult.results[0].xdr, "base64")) as string)
        : "TOKEN"

      const decimals = decimalsResult.results?.[0]
        ? Number(scValToNative(xdr.ScVal.fromXDR(decimalsResult.results[0].xdr, "base64")))
        : 7

      const name = nameResult.results?.[0]
        ? (scValToNative(xdr.ScVal.fromXDR(nameResult.results[0].xdr, "base64")) as string)
        : "Unknown Token"

      const metadata: TokenMetadata = {
        symbol,
        decimals,
        name,
      }

      // Cache the result
      this.cache.set(tokenAddress, metadata)

      return metadata
    } catch (error) {
      console.error("Failed to fetch token metadata:", error)
      // Return fallback metadata
      return {
        symbol: "TOKEN",
        decimals: 7,
        name: "Unknown Token",
      }
    }
  }

  /**
   * Get the token contract address
   */
  private getContractAddress(): string {
    return (
      import.meta.env.VITE_REWARDS_TOKEN_CONTRACT_ID ||
      import.meta.env.VITE_USDC_TOKEN_ADDRESS ||
      ""
    )
  }

  /**
   * Clear cache for a specific token address
   */
  clearCache(tokenAddress?: string): void {
    if (tokenAddress) {
      this.cache.delete(tokenAddress)
    } else {
      this.cache.clear()
    }
  }
}
