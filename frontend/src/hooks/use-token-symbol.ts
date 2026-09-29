import { env } from "@/lib/env"
import { useTokenMetadata } from "./use-token-metadata"

export function useTokenSymbol(tokenAddress?: string) {
  const address =
    tokenAddress || env.VITE_REWARDS_TOKEN_CONTRACT_ID || env.VITE_USDC_TOKEN_ADDRESS || ""
  const { metadata, isLoading, error } = useTokenMetadata(address)

  const symbol = metadata?.symbol || "TOKEN"

  return {
    symbol,
    metadata,
    isLoading,
    error,
  }
}
