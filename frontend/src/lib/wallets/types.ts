export type WalletId = "freighter" | "xbull" | "albedo" | "walletconnect"

export type WalletNetwork = "mainnet" | "testnet" | "standalone" | "futurenet" | "unknown"

export interface WalletAccount {
  address: string
}

export interface WalletNetworkDetails {
  network?: string
  networkPassphrase?: string
}

export interface SignTransactionOptions {
  networkPassphrase?: string
  accountToSign?: string
}

export interface WalletAdapter {
  readonly id: WalletId
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly installUrl: string

  /** Check if the wallet extension or client is installed/available. */
  isInstalled(): Promise<boolean> | boolean

  /** Connect to the wallet and request user permission/address. */
  connect(): Promise<WalletAccount>

  /** Disconnect the active wallet session. */
  disconnect(): Promise<void> | void

  /** Get the current active account address. */
  getAddress(): Promise<WalletAccount>

  /** Get the network or network passphrase configured in the wallet. */
  getNetworkDetails?(): Promise<WalletNetworkDetails>

  /** Sign a transaction XDR with the wallet. */
  signTransaction(xdr: string, options?: SignTransactionOptions): Promise<{ signedTxXdr: string }>
}
