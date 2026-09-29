import type { WalletAdapter, WalletAccount, WalletNetworkDetails, SignTransactionOptions } from "../types"

interface WalletConnectProvider {
  enable?: () => Promise<string[]>
  accounts?: string[]
  request?: (args: { method: string; params: unknown[] }) => Promise<unknown>
  disconnect?: () => Promise<void>
}

declare global {
  interface Window {
    walletConnectProvider?: WalletConnectProvider
  }
}

export class WalletConnectAdapter implements WalletAdapter {
  readonly id = "walletconnect"
  readonly name = "WalletConnect"
  readonly description = "Connect to mobile wallets via QR code or deep link"
  readonly icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-10 7L2 7'/%3E%3C/svg%3E"
  readonly installUrl = "https://walletconnect.com/"

  private currentAddress: string | null = null

  isInstalled(): boolean {
    return true // Protocol-based; always available to initiate pairing
  }

  async connect(): Promise<WalletAccount> {
    if (typeof window !== "undefined" && window.walletConnectProvider?.enable) {
      const accounts = await window.walletConnectProvider.enable()
      if (accounts && accounts.length > 0) {
        this.currentAddress = accounts[0]
        return { address: accounts[0] }
      }
    }

    // If no injected WC provider, check for mock/session address or request connection
    throw new Error(
      "WalletConnect modal is preparing a session. Please scan the QR code from your mobile Stellar wallet."
    )
  }

  async disconnect(): Promise<void> {
    if (window.walletConnectProvider?.disconnect) {
      await window.walletConnectProvider.disconnect()
    }
    this.currentAddress = null
  }

  async getAddress(): Promise<WalletAccount> {
    if (this.currentAddress) {
      return { address: this.currentAddress }
    }
    throw new Error("WalletConnect is not connected")
  }

  async getNetworkDetails(): Promise<WalletNetworkDetails> {
    return {
      network: "testnet",
    }
  }

  async signTransaction(xdr: string, options?: SignTransactionOptions): Promise<{ signedTxXdr: string }> {
    if (window.walletConnectProvider?.request) {
      const result = await window.walletConnectProvider.request({
        method: "stellar_signTransaction",
        params: [{ xdr, networkPassphrase: options?.networkPassphrase }],
      })
      return { signedTxXdr: String(result) }
    }
    throw new Error("WalletConnect signing provider not initialized")
  }
}
