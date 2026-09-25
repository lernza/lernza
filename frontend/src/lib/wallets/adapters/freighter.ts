import freighter, {
  signTransaction as freighterSignTx,
  getNetworkDetails as freighterGetNetworkDetails,
  getAddress as freighterGetAddress,
} from "@stellar/freighter-api"
import type { WalletAdapter, WalletAccount, WalletNetworkDetails, SignTransactionOptions } from "../types"

type FreighterApi = {
  requestAccess: () => Promise<{ address: string }>
  getAddress: () => Promise<{ address: string }>
  isConnected?: () => Promise<boolean | { isConnected?: boolean }>
  getNetworkDetails?: () => Promise<{ network?: string; networkPassphrase?: string }>
}

const freighterApi = freighter as unknown as FreighterApi

export class FreighterAdapter implements WalletAdapter {
  readonly id = "freighter"
  readonly name = "Freighter"
  readonly description = "Official browser extension from the Stellar Development Foundation"
  readonly icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3C/svg%3E"
  readonly installUrl = "https://www.freighter.app/"

  async isInstalled(): Promise<boolean> {
    try {
      const result = await freighterApi.isConnected?.()
      if (typeof result === "boolean") return result
      return Boolean(result && "isConnected" in result ? result.isConnected : false)
    } catch {
      return false
    }
  }

  async connect(): Promise<WalletAccount> {
    const access = await freighterApi.requestAccess()
    return { address: access.address }
  }

  async disconnect(): Promise<void> {
    // Freighter does not expose programmatic revocation; handled via local session clear.
  }

  async getAddress(): Promise<WalletAccount> {
    const res = await freighterGetAddress()
    return { address: res.address }
  }

  async getNetworkDetails(): Promise<WalletNetworkDetails> {
    const details = await freighterGetNetworkDetails()
    return {
      network: details.network,
      networkPassphrase: details.networkPassphrase,
    }
  }

  async signTransaction(xdr: string, options?: SignTransactionOptions): Promise<{ signedTxXdr: string }> {
    const signedTxXdr = await freighterSignTx(xdr, {
      networkPassphrase: options?.networkPassphrase,
      accountToSign: options?.accountToSign,
    })
    return { signedTxXdr }
  }
}
