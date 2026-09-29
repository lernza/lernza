import type { WalletAdapter, WalletAccount, WalletNetworkDetails, SignTransactionOptions } from "../types"

interface AlbedoIntent {
  publicKey: (params?: Record<string, unknown>) => Promise<{ pubkey: string; signed_message?: string }>
  tx: (params: { xdr: string; network?: string }) => Promise<{ signed_envelope_xdr: string; tx_hash: string }>
}

declare global {
  interface Window {
    albedo?: AlbedoIntent
  }
}

export class AlbedoAdapter implements WalletAdapter {
  readonly id = "albedo"
  readonly name = "Albedo"
  readonly description = "Web & browser extension signer for Stellar accounts"
  readonly icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2'%3E%3Cpolygon points='12 2 2 7 12 12 22 7 12 2'/%3E%3Cpolyline points='2 17 12 22 22 17'/%3E%3Cpolyline points='2 12 12 17 22 12'/%3E%3C/svg%3E"
  readonly installUrl = "https://albedo.link/"

  private currentAddress: string | null = null

  isInstalled(): boolean {
    // Albedo works both as browser extension and web signer via popup
    return typeof window !== "undefined"
  }

  async connect(): Promise<WalletAccount> {
    if (typeof window === "undefined") {
      throw new Error("Window context is not available")
    }

    if (window.albedo?.publicKey) {
      const res = await window.albedo.publicKey()
      this.currentAddress = res.pubkey
      return { address: res.pubkey }
    }

    // Fallback: If albedo extension is not injected, load Albedo intent or direct user to albedo.link
    throw new Error(
      "Albedo signer is not available. Please install the Albedo extension or use https://albedo.link"
    )
  }

  async disconnect(): Promise<void> {
    this.currentAddress = null
  }

  async getAddress(): Promise<WalletAccount> {
    if (this.currentAddress) {
      return { address: this.currentAddress }
    }
    throw new Error("Albedo is not connected")
  }

  async getNetworkDetails(): Promise<WalletNetworkDetails> {
    return {
      network: "testnet",
    }
  }

  async signTransaction(xdr: string, options?: SignTransactionOptions): Promise<{ signedTxXdr: string }> {
    if (!window.albedo?.tx) {
      throw new Error("Albedo is not available to sign this transaction")
    }

    const res = await window.albedo.tx({
      xdr,
      network: options?.networkPassphrase,
    })

    return { signedTxXdr: res.signed_envelope_xdr }
  }
}
