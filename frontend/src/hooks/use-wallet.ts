import { useState, useCallback, useEffect } from "react"
import freighter from "@stellar/freighter-api"

const DISCONNECTED_KEY = "lernza_wallet_disconnected"

interface WalletState {
  address: string | null
  connected: boolean
  loading: boolean
  error: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    connected: false,
    loading: false,
    error: null,
  })

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      // Clear the disconnected flag so auto-connect works again
      sessionStorage.removeItem(DISCONNECTED_KEY)
      const { address } = await freighter.requestAccess()
      setState({ address, connected: true, loading: false, error: null })
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet",
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    // Set flag so auto-connect on mount doesn't re-connect
    sessionStorage.setItem(DISCONNECTED_KEY, "true")
    setState({ address: null, connected: false, loading: false, error: null })
  }, [])

  useEffect(() => {
    // Don't auto-connect if user explicitly disconnected this session
    if (sessionStorage.getItem(DISCONNECTED_KEY)) return

    freighter
      .requestAccess()
      .then(({ address }) => {
        if (address) {
          setState({ address, connected: true, loading: false, error: null })
        }
      })
      .catch(() => {})
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    shortAddress: state.address
      ? `${state.address.slice(0, 4)}...${state.address.slice(-4)}`
      : null,
  }
}
