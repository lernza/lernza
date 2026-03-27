import { useState, useEffect } from "react"
import { TokenClient, type TokenMetadata } from "@/lib/contracts/token"

export function useTokenMetadata(tokenAddress?: string) {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenAddress) {
      setMetadata(null)
      setError("No token address provided")
      return
    }

    const tokenClient = new TokenClient(tokenAddress)

    const fetchMetadata = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const tokenMetadata = await tokenClient.getTokenMetadata()
        setMetadata(tokenMetadata)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch token metadata"
        setError(errorMessage)
        setMetadata(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetadata()
  }, [tokenAddress])

  return { metadata, isLoading, error }
}
