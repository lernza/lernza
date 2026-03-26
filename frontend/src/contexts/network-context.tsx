import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { getNetwork, setNetwork as persistNetwork, type Network } from "@/lib/network"

interface NetworkContextValue {
  network: Network
  isMainnet: boolean
  switchNetwork: (n: Network) => void
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<Network>(getNetwork)

  const switchNetwork = useCallback((n: Network) => {
    persistNetwork(n)
    setNetworkState(n)
  }, [])

  return (
    <NetworkContext.Provider value={{ network, isMainnet: network === "mainnet", switchNetwork }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const ctx = useContext(NetworkContext)
  if (!ctx) throw new Error("useNetwork must be used inside <NetworkProvider>")
  return ctx
}
