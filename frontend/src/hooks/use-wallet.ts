import { useState, useCallback, useEffect } from "react"
import freighter from "@stellar/freighter-api"
import { NETWORK_PASSPHRASE } from "@/lib/contracts/client"

const DISCONNECTED_KEY = "lernza_wallet_disconnected"
const FREIGHTER_INSTALL_URL = "https://www.freighter.app/"

export type WalletNetwork = "mainnet" | "testnet" | "standalone" | "futurenet" | "unknown"

export type WalletErrorCode = "freighter_not_installed" | "network_error" | "unknown"

export interface WalletErrorState {
  code: WalletErrorCode
  message: string
}

interface WalletState {
  address: string | null
  connected: boolean
  networkPassphrase: string | null
  isSupportedNetwork: boolean
  loading: boolean
  installed: boolean
  network: WalletNetwork | null
  networkName: string | null
  expectedNetwork: WalletNetwork
  expectedNetworkName: string
  wrongNetwork: boolean
  error: WalletErrorState | null
}

function parseNetwork(passphrase?: string | null, network?: string | null): WalletNetwork {
  const source = `${network ?? ""} ${passphrase ?? ""}`.toLowerCase()
  if (source.includes("public") || source.includes("mainnet")) return "mainnet"
  if (source.includes("test sdf") || source.includes("testnet")) return "testnet"
  if (source.includes("standalone")) return "standalone"
  if (source.includes("future")) return "futurenet"
  return "unknown"
}

function getNetworkName(network: WalletNetwork): string {
  switch (network) {
    case "mainnet":
      return "Mainnet"
    case "testnet":
      return "Testnet"
    case "standalone":
      return "Standalone"
    case "futurenet":
      return "Futurenet"
    default:
      return "Unknown"
  }
}

function getExpectedNetwork(): WalletNetwork {
  return parseNetwork(NETWORK_PASSPHRASE, null)
}

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("timeout") ||
    msg.includes("internet") ||
    msg.includes("offline")
  )
}

type FreighterApi = {
  requestAccess: () => Promise<{ address: string }>
  getAddress: () => Promise<{ address: string }>
  isConnected?: () => Promise<boolean | { isConnected?: boolean }>
  getNetworkDetails?: () => Promise<{ network?: string; networkPassphrase?: string }>
}

const freighterApi = freighter as unknown as FreighterApi

export function useWallet() {
  const expectedNetwork = getExpectedNetwork()

  const [state, setState] = useState<WalletState>({
    address: null,
    connected: false,
    networkPassphrase: null,
    isSupportedNetwork: true,
    loading: false,
    installed: true,
    network: null,
    networkName: null,
    expectedNetwork,
    expectedNetworkName: getNetworkName(expectedNetwork),
    wrongNetwork: false,
    error: null,
  })

  const clearConnection = useCallback(() => {
    setState(s => ({
      ...s,
      address: null,
      connected: false,
      networkPassphrase: null,
      isSupportedNetwork: true,
      loading: false,
      error: null,
    }))
  }, [])

  const syncNetwork = useCallback(async () => {
    try {
      const details = await freighterApi.getNetworkDetails?.()
      const detected = parseNetwork(details?.networkPassphrase, details?.network)
      const detectedName = details?.network ?? getNetworkName(detected)
      const passphrase = details?.networkPassphrase ?? null
      const isSupported = !passphrase || passphrase === NETWORK_PASSPHRASE

      setState(s => ({
        ...s,
        network: detected,
        networkName: detectedName,
        networkPassphrase: passphrase,
        isSupportedNetwork: isSupported,
        wrongNetwork: detected !== "unknown" && detected !== s.expectedNetwork,
      }))
    } catch {
      // Best effort only.
    }
  }, [])

  const detectFreighter = useCallback(async (): Promise<boolean> => {
    try {
      const result = await freighterApi.isConnected?.()
      const installed =
        typeof result === "boolean"
          ? result
          : Boolean(result && "isConnected" in result ? result.isConnected : false)

      setState(s => ({
        ...s,
        installed,
        error: installed
          ? s.error?.code === "freighter_not_installed"
            ? null
            : s.error
          : {
              code: "freighter_not_installed",
              message: "Freighter is not installed. Install Freighter to connect your wallet.",
            },
      }))
      return installed
    } catch {
      setState(s => ({
        ...s,
        installed: false,
        error: {
          code: "freighter_not_installed",
          message: "Freighter is not installed. Install Freighter to connect your wallet.",
        },
      }))
      return false
    }
  }, [])

  const connect = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const installed = await detectFreighter()
      if (!installed) {
        setState(s => ({ ...s, loading: false }))
        return
      }

      sessionStorage.removeItem(DISCONNECTED_KEY)
      const { address } = await freighterApi.requestAccess()
      await syncNetwork()

      setState(s => ({
        ...s,
        address,
        connected: true,
        loading: false,
        error: null,
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const normalized = msg.toLowerCase()

      if (
        normalized.includes("reject") ||
        normalized.includes("cancel") ||
        normalized.includes("denied")
      ) {
        setState(s => ({
          ...s,
          loading: false,
          error: null,
          connected: false,
          address: null,
        }))
        return
      }

      setState(s => ({
        ...s,
        loading: false,
        error: isNetworkError(err)
          ? {
              code: "network_error",
              message:
                "Network error while connecting wallet. Check Freighter and your internet connection, then retry.",
            }
          : {
              code: "unknown",
              message: err instanceof Error ? err.message : "Failed to connect wallet",
            },
      }))
    }
  }, [detectFreighter, syncNetwork])

  const disconnect = useCallback(() => {
    sessionStorage.setItem(DISCONNECTED_KEY, "true")
    clearConnection()
  }, [clearConnection])

  useEffect(() => {
    let active = true

    const boot = async () => {
      const installed = await detectFreighter()
      if (!installed || !active) return

      await syncNetwork()

      if (sessionStorage.getItem(DISCONNECTED_KEY)) return

      try {
        const { address } = await freighterApi.getAddress()
        if (!active) return

        if (address) {
          setState(s => ({ ...s, address, connected: true, loading: false, error: null }))
        }
      } catch {
        if (!active) return
        clearConnection()
      }
    }

    void boot()

    return () => {
      active = false
    }
  }, [clearConnection, detectFreighter, syncNetwork])

  return {
    ...state,
    installUrl: FREIGHTER_INSTALL_URL,
    connect,
    disconnect,
    shortAddress: state.address
      ? `${state.address.slice(0, 4)}...${state.address.slice(-4)}`
      : null,
  }
}
