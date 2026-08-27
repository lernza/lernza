import type { Page } from "@playwright/test"

export const MOCK_ADDRESS = "GBMOCKADDRESS123STELLAR456WALLET789ABCDEFGH"

/**
 * Inject a stubbed Freighter wallet into the page before any scripts run.
 * Must be called before page.goto().
 */
export async function mockWallet(page: Page, address = MOCK_ADDRESS) {
  await page.addInitScript((addr: string) => {
    const stub = {
      isConnected: () => Promise.resolve(true),
      getAddress: () => Promise.resolve({ address: addr }),
      getNetwork: () =>
        Promise.resolve({
          network: "TESTNET",
          networkPassphrase: "Test SDF Network ; September 2015",
        }),
      getNetworkDetails: () =>
        Promise.resolve({
          network: "TESTNET",
          networkPassphrase: "Test SDF Network ; September 2015",
        }),
      requestAccess: () => Promise.resolve({ address: addr }),
      signTransaction: (xdr: string) => Promise.resolve({ signedTxXdr: xdr }),
    }
    Object.defineProperty(window, "freighter", { value: stub, writable: true })
    Object.defineProperty(window, "freighterApi", { value: stub, writable: true })
  }, address)
}
