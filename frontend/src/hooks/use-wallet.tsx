import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import freighter, { WatchWalletChanges } from "@stellar/freighter-api"
import { NETWORK_PASSPHRASE } from "@/lib/contracts/client"
import { pushToast } from "@/lib/notifications"

const DISCONNECTED_KEY = "lernza_wallet_disconnected"
const FREIGHTER_INSTALL_URL = "https://www.freighter.app/"
// Poll interval for reflecting account/network switches made inside Freighter.
const WALLET_WATCH_INTERVAL_MS = 3000

export type WalletNetwork = "mainnet" | "testnet" | "standalone" | "futurenet" | "unknown"

export type WalletErrorCode =
  | "freighter_not_installed"
  | "network_error"
  | "timeout"
  | "missing_api"
  | "user_rejected"
  | "unknown"

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
    msg.includes("internet") ||
    msg.includes("offline")
  )
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(timeoutError), timeoutMs)),
  ])
}

const TIMEOUT_MS = 10000
const TIMEOUT_ERROR = new Error("Freighter request timed out")

type FreighterApi = {
  requestAccess: () => Promise<{ address: string }>
  getAddress: () => Promise<{ address: string }>
  isConnected?: () => Promise<boolean | { isConnected?: boolean }>
  isAllowed?: () => Promise<boolean | { isAllowed?: boolean }>
  setAllowed?: () => Promise<boolean | { isAllowed?: boolean }>
  getNetworkDetails?: () => Promise<{ network?: string; networkPassphrase?: string }>
}

const freighterApi = freighter as unknown as FreighterApi
type WalletContextValue = WalletState & {
  installUrl: string
  connect: () => Promise<void>
  retryConnect: () => Promise<void>
  resetWalletError: () => void
  /** Re-checks wallet permission and the active account before protected use. */
  verifySession: () => Promise<boolean>
  disconnect: () => void
  shortAddress: string | null
}

const WalletContext = createContext<WalletContextValue | null>(null)

function getManualDisconnect(): boolean {
  try {
    return localStorage.getItem(DISCONNECTED_KEY) === "true"
  } catch {
    return false
  }
}

function setManualDisconnect() {
  try {
    localStorage.setItem(DISCONNECTED_KEY, "true")
  } catch {
    // localStorage unavailable - best effort only.
  }
}

function clearManualDisconnect() {
  try {
    localStorage.removeItem(DISCONNECTED_KEY)
  } catch {
    // localStorage unavailable - best effort only.
  }
}

function useWalletState(): WalletContextValue {
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
      network: null,
      networkName: null,
      networkPassphrase: null,
      isSupportedNetwork: true,
      wrongNetwork: false,
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

      // Check for missing API before attempting connection
      if (!freighterApi.getNetworkDetails) {
        setState(s => ({
          ...s,
          loading: false,
          error: {
            code: "missing_api",
            message:
              "Your Freighter version is outdated and missing required features. Please update Freighter to the latest version and try again.",
          },
        }))
        return
      }

      clearManualDisconnect()
      const { address } = await withTimeout(freighterApi.requestAccess(), TIMEOUT_MS, TIMEOUT_ERROR)
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
        // Distinguish a user declining the connection from a network/timeout
        // failure. Previously both resulted in a silent (null) error, leaving
        // the user unable to tell whether to retry, switch wallets, or check
        // their network.
        setState(s => ({
          ...s,
          loading: false,
          connected: false,
          address: null,
          error: {
            code: "user_rejected",
            message:
              "You rejected the wallet connection request. Reconnect and approve the request to continue, or switch wallets if you changed your mind.",
          },
        }))
        return
      }

      // Check for timeout first
      if (msg === TIMEOUT_ERROR.message || normalized.includes("timed out")) {
        setState(s => ({
          ...s,
          loading: false,
          error: {
            code: "timeout",
            message:
              "Freighter did not respond in time. Make sure Freighter is unlocked and try again.",
          },
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
                "Network error while connecting wallet. Check your internet connection and Freighter status, then retry.",
            }
          : {
              code: "unknown",
              message: err instanceof Error ? err.message : "Failed to connect wallet",
            },
      }))
    }
  }, [detectFreighter, syncNetwork])

  const disconnect = useCallback(() => {
    setManualDisconnect()
    clearConnection()
  }, [clearConnection])

  const verifySession = useCallback(async (): Promise<boolean> => {
    if (getManualDisconnect()) {
      clearConnection()
      return false
    }

    try {
      const installed = await detectFreighter()
      if (!installed) {
        clearConnection()
        return false
      }
      const { address } = await withTimeout(freighterApi.getAddress(), TIMEOUT_MS, TIMEOUT_ERROR)
      if (!address) {
        clearConnection()
        return false
      }
      await syncNetwork()
      setState(s => ({ ...s, address, connected: true, loading: false, error: null }))
      return true
    } catch {
      // A stale React state value must never be accepted as a valid session.
      clearConnection()
      return false
    }
  }, [clearConnection, detectFreighter, syncNetwork])

  useEffect(() => {
    let active = true

    const boot = async () => {
      const installed = await detectFreighter()
      if (!installed || !active) return

      await syncNetwork()

      if (getManualDisconnect()) return

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

  // Reflect account/network switches the user makes inside the Freighter
  // extension. A dApp cannot open Freighter's account picker, but it can react
  // when the active account or network changes, keeping the UI in sync without
  // a manual refresh. Respects the manual-disconnect flag so an explicit
  // disconnect is never silently overridden.
  useEffect(() => {
    const watcher = new WatchWalletChanges(WALLET_WATCH_INTERVAL_MS)

    watcher.watch(({ address, network, networkPassphrase, error }) => {
      if (getManualDisconnect()) return

      if (error || !address) {
        // Wallet locked or access revoked from inside the extension.
        setState(s => {
          if (s.connected) {
            // Notify user of unexpected disconnect
            pushToast({
              message: "Wallet disconnected. Reconnect to continue using on-chain features.",
              type: "warning",
              duration: 6000,
            })
            return {
              ...s,
              address: null,
              connected: false,
              network: null,
              networkName: null,
              networkPassphrase: null,
              isSupportedNetwork: true,
              wrongNetwork: false,
            }
          }
          return s
        })
        return
      }

      const detected = parseNetwork(networkPassphrase, network)
      const isSupported = !networkPassphrase || networkPassphrase === NETWORK_PASSPHRASE

      setState(s => {
        const wrongNetwork = detected !== "unknown" && detected !== s.expectedNetwork
        // Skip redundant updates so polling doesn't trigger needless re-renders.
        if (
          s.connected &&
          s.address === address &&
          s.networkPassphrase === (networkPassphrase ?? null) &&
          s.wrongNetwork === wrongNetwork
        ) {
          return s
        }

        return {
          ...s,
          address,
          connected: true,
          network: detected,
          networkName: network ?? getNetworkName(detected),
          networkPassphrase: networkPassphrase ?? null,
          isSupportedNetwork: isSupported,
          wrongNetwork,
          error: null,
        }
      })
    })

    return () => watcher.stop()
  }, [])

  const resetWalletError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
  }, [])

  const retryConnect = useCallback(async () => {
    resetWalletError()
    await connect()
  }, [connect, resetWalletError])

  return useMemo(
    () => ({
      ...state,
      installUrl: FREIGHTER_INSTALL_URL,
      connect,
      retryConnect,
      resetWalletError,
      verifySession,
      disconnect,
      shortAddress: state.address
        ? `${state.address.slice(0, 4)}...${state.address.slice(-4)}`
        : null,
    }),
    [connect, disconnect, resetWalletError, retryConnect, state, verifySession]
  )
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWalletState()

  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const wallet = useContext(WalletContext)
  if (!wallet) {
    throw new Error("useWallet must be used inside WalletProvider")
  }

  return wallet
}
