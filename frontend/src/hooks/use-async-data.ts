import { useQuery } from "@tanstack/react-query"    
    
export interface AsyncDataState<T> {    
  data: T | null    
  isLoading: boolean    
  error: string | null    
  isEmpty: boolean    
}    
    
export interface UseAsyncDataOptions<T> {    
  initialData?: T | null    
  queryKey: unknown[]    
  enabled?: boolean    
}    
    
export function useAsyncData<T>(    
  queryFn: () => Promise<T>,    
  options: UseAsyncDataOptions<T>    
): AsyncDataState<T> & { refetch: () => Promise<void> } {    
  const { initialData = null, queryKey, enabled = true } = options    
    
  const query = useQuery({    
    queryKey,    
    queryFn,    
    enabled,    
    initialData,    
  })    
    
  return {    
    data: query.data ?? null,    
    isLoading: query.isPending,    
    error: query.error?.message ?? null,    
    isEmpty: !query.data || (Array.isArray(query.data) && query.data.length === 0),    
    refetch: () => query.refetch(),    
  }    
}    
    
// --- Contract-specific hook ---    
    
export interface UseContractDataOptions<T> extends UseAsyncDataOptions<T> {    
  contractUnavailableMessage?: string    
}    
    
export function useContractData<T>(    
  contractName: string,    
  queryFn: () => Promise<T>,    
  options: UseContractDataOptions<T>    
): AsyncDataState<T> & { refetch: () => Promise<void> } {    
  const { contractUnavailableMessage, ...asyncOptions } = options    
    
  const state = useAsyncData(queryFn, {    
    ...asyncOptions,    
    queryKey: ['contract', contractName, ...asyncOptions.queryKey],    
  })    
    
  // Override error message for contract unavailability    
  if (state.error?.includes("not configured")) {    
    return {    
      ...state,    
      error:    
        contractUnavailableMessage ||    
        `On-chain data is unavailable until the ${contractName} contract is configured.`,    
    }    
  }    
    
  return state    
}
