import { useState, useEffect, useCallback, useRef } from "react"

export interface AsyncDataState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  isEmpty: boolean
}

export interface UseAsyncDataOptions<T> {
  initialData?: T | null
  dependencies?: React.DependencyList
  enabled?: boolean
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): AsyncDataState<T> & { refetch: () => Promise<void> } {
  const { initialData = null, dependencies = [], enabled = true } = options

  const [state, setState] = useState<AsyncDataState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
    isEmpty: !initialData,
  })

  // Use a ref for the fetcher to avoid re-triggering the effect when the
  // fetcher function identity changes (which happens every render since
  // callers pass inline arrow functions).
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Track whether a fetch is already in-flight to prevent overlapping calls.
  const inflightRef = useRef(false)

  const execute = useCallback((): Promise<void> => {
    if (!enabled || inflightRef.current) return Promise.resolve()

    inflightRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    return fetcherRef
      .current()
      .then(result => {
        setState({
          data: result,
          isLoading: false,
          error: null,
          isEmpty: !result || (Array.isArray(result) && result.length === 0),
        })
      })
      .catch(err => {
        const message = err instanceof Error ? err.message : "An error occurred"
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }))
      })
      .finally(() => {
        inflightRef.current = false
      })
  }, [enabled])

  const refetch = useCallback(() => execute(), [execute])

  // Only re-run when `enabled` changes or when the caller's explicit
  // `dependencies` array values change. The fetcher ref keeps us from
  // needing `execute` in the dep array (which previously caused loops).
  useEffect(() => {
    if (enabled) {
      void execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies])

  return {
    ...state,
    refetch,
  }
}

// --- Contract-specific hook ---

export interface UseContractDataOptions<T> extends UseAsyncDataOptions<T> {
  contractUnavailableMessage?: string
}

export function useContractData<T>(
  contractName: string,
  fetcher: () => Promise<T>,
  options: UseContractDataOptions<T> = {}
): AsyncDataState<T> & { refetch: () => Promise<void> } {
  const { contractUnavailableMessage, ...asyncOptions } = options

  const state = useAsyncData(fetcher, asyncOptions)

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
