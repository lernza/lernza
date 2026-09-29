import type { WalletAdapter, WalletAccount, WalletNetworkDetails, SignTransactionOptions } from "../types"

interface XBullSDK {
  getPublicKey?: () => Promise<string>
  sign?: (params: { xdr: string; publicKey?: string; network?: string }) => Promise<string>
}

declare global {
  interface Window {
    xBullSDK?: XBullSDK
  }
}

export class XBullAdapter implements WalletAdapter {
  readonly id = "xbull"
  readonly name = "xBull"
  readonly description = "Non-custodial multi-platform Stellar wallet extension & web app"
  readonly icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e0a04d' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='m8 12 3 3 5-5'/%3E%3C/svg%3E"
  readonly installUrl = "https://xbull.app/"

  private currentAddress: string | null = null

  isInstalled(): boolean {
    return typeof window !== "undefined" && typeof window.xBullSDK !== "undefined"
  }

  async connect(): Promise<WalletAccount> {
    if (!this.isInstalled() || !window.xBullSDK?.getPublicKey) {
      // In browsers without the extension, open the xBull web connection portal or prompt install
      throw new Error("xBull wallet extension is not installed. Please install xBull from https://xbull.app/")
    }

    const publicKey = await window.xBullSDK.getPublicKey()
    if (!publicKey) {
      throw new Error("xBull connection request rejected by user")
    }

    this.currentAddress = publicKey
    return { address: publicKey }
  }

  async disconnect(): Promise<void> {
    this.currentAddress = null
  }

  async getAddress(): Promise<WalletAccount> {
    if (this.currentAddress) {
      return { address: this.currentAddress }
    }
    if (this.isInstalled() && window.xBullSDK?.getPublicKey) {
      const publicKey = await window.xBullSDK.getPublicKey()
      if (publicKey) {
        this.currentAddress = publicKey
        return { address: publicKey }
      }
    }
    throw new Error("xBull is not connected")
  }

  async getNetworkDetails(): Promise<WalletNetworkDetails> {
    return {
      network: "testnet",
    }
  }

  async signTransaction(xdr: string, options?: SignTransactionOptions): Promise<{ signedTxXdr: string }> {
    if (!this.isInstalled() || !window.xBullSDK?.sign) {
      throw new Error("xBull wallet extension is not available for signing")
    }

    const signedTxXdr = await window.xBullSDK.sign({
      xdr,
      publicKey: options?.accountToSign ?? this.currentAddress ?? undefined,
      network: options?.networkPassphrase,
    })

    return { signedTxXdr }
  }
}
