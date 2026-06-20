import { useQuery } from "@tanstack/react-query"
import { TokenClient, type TokenMetadata } from "@/lib/contracts/token"

export function useTokenMetadata(tokenAddress?: string) {
  const query = useQuery<TokenMetadata, Error>({
    queryKey: ["tokenMetadata", tokenAddress],
    queryFn: async () => {
      const client = new TokenClient(tokenAddress!)
      return client.getTokenMetadata()
    },
    enabled: Boolean(tokenAddress),
  })

  if (!tokenAddress) {
    return { metadata: null, isLoading: false, error: "No token address provided" }
  }

  return {
    metadata: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  }
}
