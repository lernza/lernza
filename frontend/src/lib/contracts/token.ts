/** SEP-41 token contract client for balance queries, transfers, and metadata. */
import { isDev } from "@/lib/env"
import { Contract } from "@stellar/stellar-sdk"
import { simulateContractRead } from "./client"
import { contractAddresses } from "./config"

export interface TokenMetadata {
  symbol: string
  decimals: number
  name: string
}

export class TokenClient {
  private contract: Contract | null
  private static cache: Map<string, TokenMetadata> = new Map()
  private tokenAddress: string = ""

  constructor(tokenAddress: string) {
    this.tokenAddress = tokenAddress
    if (tokenAddress) {
      try {
        this.contract = new Contract(tokenAddress)
      } catch {
        this.contract = null
        if (isDev) {
          console.error(`[TokenClient] Invalid token address: "${tokenAddress}"`)
        }
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
    if (TokenClient.cache.has(tokenAddress)) {
      return TokenClient.cache.get(tokenAddress)!
    }

    try {
      const [symbolResult, decimalsResult, nameResult] = await Promise.all([
        simulateContractRead(this.getContract(), { method: "symbol", args: [] }),
        simulateContractRead(this.getContract(), { method: "decimals", args: [] }),
        simulateContractRead(this.getContract(), { method: "name", args: [] }),
      ])

      const symbol = typeof symbolResult === "string" ? symbolResult : "TOKEN"
      const decimals = decimalsResult == null ? 7 : Number(decimalsResult)
      const name = typeof nameResult === "string" ? nameResult : "Unknown Token"

      const metadata: TokenMetadata = {
        symbol,
        decimals,
        name,
      }

      // Cache the result
      TokenClient.cache.set(tokenAddress, metadata)

      return metadata
    } catch (error) {
      if (isDev) {
        console.error("Failed to fetch token metadata:", error)
      }
      // Return fallback metadata
      return {
        symbol: "TOKEN",
        decimals: 7,
        name: "Unknown Token",
      }
    }
  }

  /**
   * Get the token contract address.
   * Throws if no address is provided via constructor or environment.
   */
  private getContractAddress(): string {
    const addr = this.tokenAddress || contractAddresses.token

    if (!addr) {
      throw new Error(
        "Token address not configured. Set VITE_REWARDS_TOKEN_CONTRACT_ID or VITE_USDC_TOKEN_ADDRESS."
      )
    }
    return addr
  }

  /**
   * Clear cache for a specific token address
   */
  clearCache(tokenAddress?: string): void {
    if (tokenAddress) {
      TokenClient.cache.delete(tokenAddress)
    } else {
      TokenClient.cache.clear()
    }
  }
}
