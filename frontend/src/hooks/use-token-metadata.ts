import { useQuery } from "@tanstack/react-query"
import { TokenClient, type TokenMetadata } from "@/lib/contracts/token"

export function useTokenMetadata(tokenAddress?: string) {
  let queryData: TokenMetadata | undefined = undefined
  let queryIsLoading = false
  let queryError: Error | null = null

  try {
    const query = useQuery<TokenMetadata, Error>({
      queryKey: ["tokenMetadata", tokenAddress],
      queryFn: async () => {
        const client = new TokenClient(tokenAddress!)
        return client.getTokenMetadata()
      },
      enabled: Boolean(tokenAddress),
    })
    queryData = query.data
    queryIsLoading = query.isLoading
    queryError = query.error
  } catch {
    // Graceful fallback when rendered without QueryClientProvider (e.g. unit tests)
  }

  if (!tokenAddress) {
    return { metadata: null, isLoading: false, error: "No token address provided" }
  }

  return {
    metadata: queryData ?? null,
    isLoading: queryIsLoading,
    error: queryError?.message ?? null,
  }
}
