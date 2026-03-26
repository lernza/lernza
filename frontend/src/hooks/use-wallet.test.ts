import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useWallet } from "./use-wallet"

vi.mock("@/lib/contracts/client", () => ({
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}))

vi.mock("@stellar/freighter-api", () => ({
  default: {
    requestAccess: vi.fn(),
    getAddress: vi.fn(),
    isConnected: vi.fn(),
    getNetworkDetails: vi.fn(),
  },
}))

import freighter from "@stellar/freighter-api"

const mockFreighter = freighter as {
  requestAccess: ReturnType<typeof vi.fn>
  getAddress: ReturnType<typeof vi.fn>
  isConnected: ReturnType<typeof vi.fn>
  getNetworkDetails: ReturnType<typeof vi.fn>
}

const DISCONNECTED_KEY = "lernza_wallet_disconnected"

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  mockFreighter.isConnected.mockResolvedValue(true)
  mockFreighter.getAddress.mockResolvedValue({ address: "" })
  mockFreighter.getNetworkDetails.mockResolvedValue({
    network: "testnet",
    networkPassphrase: "Test SDF Network ; September 2015",
  })
})

describe("useWallet - connect", () => {
  it("calls requestAccess and sets address/connected on success", async () => {
    mockFreighter.requestAccess.mockResolvedValue({ address: "GABC1234" })

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockFreighter.requestAccess).toHaveBeenCalledOnce()
    expect(result.current.address).toBe("GABC1234")
    expect(result.current.connected).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.networkName).toBe("testnet")
    expect(result.current.wrongNetwork).toBe(false)
  })

  it("sets install error state when Freighter is not installed", async () => {
    mockFreighter.isConnected.mockResolvedValue(false)

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.error?.code).toBe("freighter_not_installed")
    expect(result.current.installUrl).toBe("https://www.freighter.app/")
  })

  it("suppresses error when user cancels connection", async () => {
    mockFreighter.requestAccess.mockRejectedValue(new Error("User rejected"))

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.address).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("maps network failures to typed network_error", async () => {
    mockFreighter.requestAccess.mockRejectedValue(new Error("Network request failed"))

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.error?.code).toBe("network_error")
    expect(result.current.error?.message.toLowerCase()).toContain("network error")
  })
})

describe("useWallet - disconnect", () => {
  it("sets connected false and stores DISCONNECTED_KEY in sessionStorage", async () => {
    mockFreighter.requestAccess.mockResolvedValue({ address: "GABC1234" })

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await result.current.connect()
    })

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.address).toBeNull()
    expect(sessionStorage.getItem(DISCONNECTED_KEY)).toBe("true")
  })
})

describe("useWallet - auto reconnect", () => {
  it("loads address and network when previously authorized", async () => {
    mockFreighter.getAddress.mockResolvedValue({ address: "GXYZ5678" })

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFreighter.getAddress).toHaveBeenCalledOnce()
    expect(result.current.address).toBe("GXYZ5678")
    expect(result.current.connected).toBe(true)
    expect(result.current.network).toBe("testnet")
  })

  it("does not reconnect when DISCONNECTED_KEY is set", async () => {
    sessionStorage.setItem(DISCONNECTED_KEY, "true")
    mockFreighter.getAddress.mockResolvedValue({ address: "GXYZ5678" })

    renderHook(() => useWallet())

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFreighter.getAddress).not.toHaveBeenCalled()
  })

  it("handles revoked permission by falling back to disconnected without error", async () => {
    mockFreighter.getAddress.mockRejectedValue(new Error("Not authorized"))

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.address).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("flags wrong network when wallet network differs from app network", async () => {
    mockFreighter.getAddress.mockResolvedValue({ address: "GXYZ5678" })
    mockFreighter.getNetworkDetails.mockResolvedValue({
      network: "mainnet",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    })

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.connected).toBe(true)
    expect(result.current.network).toBe("mainnet")
    expect(result.current.wrongNetwork).toBe(true)
    expect(result.current.expectedNetwork).toBe("testnet")
  })
})
