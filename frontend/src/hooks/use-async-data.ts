import { useState, useEffect, useCallback } from "react"

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

  const execute = useCallback((): Promise<void> => {
    if (!enabled) return Promise.resolve()

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    return fetcher()
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
  }, [fetcher, enabled])

  const refetch = useCallback(() => execute(), [execute])

  useEffect(() => {
    if (enabled) {
      const timeout = setTimeout(() => {
        void execute()
      }, 0)

      return () => {
        clearTimeout(timeout)
      }
    }
  }, [enabled, execute, dependencies])

  return {
    ...state,
    refetch,
  }
}

// ─── Contract-specific hook ─────────────────────────────────────────────────────

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
