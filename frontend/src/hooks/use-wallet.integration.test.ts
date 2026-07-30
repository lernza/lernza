/**
 * Integration tests for the Freighter wallet hook (#1222).
 *
 * These complement `use-wallet.test.ts` (which covers the happy connect path,
 * not-installed, user-cancel, network errors and auto-reconnect) by exercising
 * the remaining failure and rejection paths plus the live `WatchWalletChanges`
 * subscription:
 *   - request timeout mapping (`timeout`)
 *   - outdated extension missing required APIs (`missing_api`)
 *   - unexpected failures falling back to `unknown`
 *   - a throwing `isConnected` treated as not installed
 *   - `verifySession` rejecting after manual disconnect or an empty address
 *   - account switches, wrong-network switches and wallet lock/revoke pushed
 *     from inside the extension, plus manual-disconnect precedence and cleanup
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useWallet, WalletProvider } from "./use-wallet"

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015"
const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015"
const DISCONNECTED_KEY = "lernza_wallet_disconnected"

interface WalletChangeUpdate {
  address: string
  network: string
  networkPassphrase: string
  error?: unknown
}

// Shared, hoisted mock surface. The `watch` slot captures the live
// subscription callback so tests can drive extension-side changes on demand.
const mocks = vi.hoisted(() => ({
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  isConnected: vi.fn(),
  getNetworkDetails: vi.fn(),
  watch: {
    cb: null as ((update: WalletChangeUpdate) => void) | null,
    stopped: false,
    instances: 0,
  },
}))

vi.mock("@/lib/contracts/client", () => ({
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}))

vi.mock("@stellar/freighter-api", () => ({
  default: {
    requestAccess: mocks.requestAccess,
    getAddress: mocks.getAddress,
    isConnected: mocks.isConnected,
    getNetworkDetails: mocks.getNetworkDetails,
  },
  WatchWalletChanges: class {
    constructor() {
      mocks.watch.instances += 1
    }
    watch(cb: (update: WalletChangeUpdate) => void) {
      mocks.watch.cb = cb
      return {}
    }
    stop() {
      mocks.watch.stopped = true
    }
  },
}))

import freighter from "@stellar/freighter-api"

// The hook holds a live reference to the default export, so mutating it lets
// us simulate an outdated extension that is missing an API surface.
const freighterDefault = freighter as unknown as Record<string, unknown>

function renderWallet() {
  return renderHook(() => useWallet(), { wrapper: WalletProvider })
}

/** Flushes the boot effect and the watch subscription after mount. */
async function flushBoot() {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.watch.cb = null
  mocks.watch.stopped = false
  mocks.watch.instances = 0
  freighterDefault.getNetworkDetails = mocks.getNetworkDetails
  mocks.isConnected.mockResolvedValue(true)
  mocks.getAddress.mockResolvedValue({ address: "" })
  mocks.requestAccess.mockResolvedValue({ address: "GABC1234" })
  mocks.getNetworkDetails.mockResolvedValue({
    network: "testnet",
    networkPassphrase: TESTNET_PASSPHRASE,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useWallet integration - connect failure paths", () => {
  it("maps an unresponsive Freighter to a typed timeout error", async () => {
    vi.useFakeTimers()
    // requestAccess never settles, so the internal withTimeout race must win.
    mocks.requestAccess.mockReturnValue(new Promise<{ address: string }>(() => {}))

    const { result } = renderWallet()

    await act(async () => {
      const pending = result.current.connect()
      await vi.advanceTimersByTimeAsync(10_000)
      await pending
    })

    expect(result.current.error?.code).toBe("timeout")
    expect(result.current.error?.message.toLowerCase()).toContain("did not respond")
    expect(result.current.loading).toBe(false)
    expect(result.current.connected).toBe(false)
  })

  it("flags an outdated Freighter missing the network API as missing_api", async () => {
    freighterDefault.getNetworkDetails = undefined

    const { result } = renderWallet()

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.error?.code).toBe("missing_api")
    expect(result.current.error?.message.toLowerCase()).toContain("outdated")
    expect(result.current.connected).toBe(false)
    expect(mocks.requestAccess).not.toHaveBeenCalled()
  })

  it("falls back to an unknown error for unexpected failures", async () => {
    mocks.requestAccess.mockRejectedValue(new Error("Something unexpected broke"))

    const { result } = renderWallet()

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.error?.code).toBe("unknown")
    expect(result.current.error?.message).toContain("Something unexpected broke")
    expect(result.current.connected).toBe(false)
  })

  it("treats a throwing isConnected as a missing wallet", async () => {
    mocks.isConnected.mockRejectedValue(new Error("extension bridge unavailable"))

    const { result } = renderWallet()

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.installed).toBe(false)
    expect(result.current.error?.code).toBe("freighter_not_installed")
    expect(mocks.requestAccess).not.toHaveBeenCalled()
  })
})

describe("useWallet integration - session verification", () => {
  it("rejects verifySession after a manual disconnect without calling Freighter", async () => {
    localStorage.setItem(DISCONNECTED_KEY, "true")

    const { result } = renderWallet()
    await flushBoot()

    let verified = true
    await act(async () => {
      verified = await result.current.verifySession()
    })

    expect(verified).toBe(false)
    expect(result.current.connected).toBe(false)
    expect(mocks.getAddress).not.toHaveBeenCalled()
  })

  it("rejects verifySession when Freighter returns an empty address", async () => {
    mocks.getAddress.mockResolvedValue({ address: "" })

    const { result } = renderWallet()
    await flushBoot()

    let verified = true
    await act(async () => {
      verified = await result.current.verifySession()
    })

    expect(verified).toBe(false)
    expect(result.current.connected).toBe(false)
    expect(result.current.address).toBeNull()
  })
})

describe("useWallet integration - live wallet changes", () => {
  it("subscribes to WatchWalletChanges on mount and stops on unmount", async () => {
    const { unmount } = renderWallet()
    await flushBoot()

    expect(mocks.watch.instances).toBe(1)
    expect(mocks.watch.cb).toBeTypeOf("function")

    unmount()
    expect(mocks.watch.stopped).toBe(true)
  })

  it("reflects an account switch made inside the extension", async () => {
    const { result } = renderWallet()
    await flushBoot()

    act(() => {
      mocks.watch.cb?.({
        address: "GSWITCHEDACCOUNT",
        network: "testnet",
        networkPassphrase: TESTNET_PASSPHRASE,
      })
    })

    expect(result.current.address).toBe("GSWITCHEDACCOUNT")
    expect(result.current.connected).toBe(true)
    expect(result.current.wrongNetwork).toBe(false)
  })

  it("flags a wrong-network switch pushed from the extension", async () => {
    const { result } = renderWallet()
    await flushBoot()

    act(() => {
      mocks.watch.cb?.({
        address: "GSWITCHEDACCOUNT",
        network: "mainnet",
        networkPassphrase: MAINNET_PASSPHRASE,
      })
    })

    expect(result.current.network).toBe("mainnet")
    expect(result.current.wrongNetwork).toBe(true)
    expect(result.current.isSupportedNetwork).toBe(false)
  })

  it("clears the session when the wallet is locked or access is revoked", async () => {
    const { result } = renderWallet()

    await act(async () => {
      await result.current.connect()
    })
    expect(result.current.connected).toBe(true)

    act(() => {
      mocks.watch.cb?.({
        address: "",
        network: "",
        networkPassphrase: "",
        error: "Wallet is locked",
      })
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.address).toBeNull()
  })

  it("does not override a manual disconnect with watcher updates", async () => {
    const { result } = renderWallet()

    await act(async () => {
      await result.current.connect()
    })

    act(() => {
      result.current.disconnect()
    })

    act(() => {
      mocks.watch.cb?.({
        address: "GRECONNECTATTEMPT",
        network: "testnet",
        networkPassphrase: TESTNET_PASSPHRASE,
      })
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.address).toBeNull()
    expect(localStorage.getItem(DISCONNECTED_KEY)).toBe("true")
  })
})
