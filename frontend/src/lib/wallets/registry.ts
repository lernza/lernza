import { FreighterAdapter } from "./adapters/freighter"
import { XBullAdapter } from "./adapters/xbull"
import { AlbedoAdapter } from "./adapters/albedo"
import { WalletConnectAdapter } from "./adapters/walletconnect"
import type { WalletAdapter, WalletId } from "./types"

export const SELECTED_WALLET_KEY = "lernza_selected_wallet"

class WalletRegistry {
  private adapters: Map<WalletId, WalletAdapter> = new Map()
  private activeId: WalletId = "freighter"

  constructor() {
    this.register(new FreighterAdapter())
    this.register(new XBullAdapter())
    this.register(new AlbedoAdapter())
    this.register(new WalletConnectAdapter())

    if (typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem(SELECTED_WALLET_KEY) as WalletId | null
        if (saved && this.adapters.has(saved)) {
          this.activeId = saved
        }
      } catch {
        // localStorage unavailable
      }
    }
  }

  register(adapter: WalletAdapter): void {
    this.adapters.set(adapter.id, adapter)
  }

  getAdapter(id: WalletId): WalletAdapter {
    const adapter = this.adapters.get(id)
    if (!adapter) {
      throw new Error(`Wallet adapter "${id}" is not registered`)
    }
    return adapter
  }

  getAllAdapters(): WalletAdapter[] {
    return Array.from(this.adapters.values())
  }

  getActiveAdapter(): WalletAdapter {
    return this.getAdapter(this.activeId)
  }

  setActiveAdapter(id: WalletId): void {
    if (!this.adapters.has(id)) {
      throw new Error(`Cannot activate unknown wallet adapter "${id}"`)
    }
    this.activeId = id
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(SELECTED_WALLET_KEY, id)
      } catch {
        // localStorage unavailable
      }
    }
  }
}

export const walletRegistry = new WalletRegistry()

export function getActiveWalletAdapter(): WalletAdapter {
  return walletRegistry.getActiveAdapter()
}

export function setActiveWalletAdapter(id: WalletId): void {
  walletRegistry.setActiveAdapter(id)
}

export function getAllWalletAdapters(): WalletAdapter[] {
  return walletRegistry.getAllAdapters()
}

export function getWalletAdapter(id: WalletId): WalletAdapter {
  return walletRegistry.getAdapter(id)
}
