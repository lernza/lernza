import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useWallet } from "./use-wallet"

vi.mock("@stellar/freighter-api", () => ({
  default: {
    requestAccess: vi.fn(),
    getAddress: vi.fn(),
  },
}))

import freighter from "@stellar/freighter-api"

const mockFreighter = freighter as {
  requestAccess: ReturnType<typeof vi.fn>
  getAddress: ReturnType<typeof vi.fn>
}

const DISCONNECTED_KEY = "lernza_wallet_disconnected"

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  mockFreighter.getAddress.mockResolvedValue({ address: "" })
})

describe("useWallet - connect", () => {
  it("calls freighter.requestAccess and sets address and connected on success", async () => {
    mockFreighter.requestAccess.mockResolvedValue({ address: "GABC1234" })

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockFreighter.requestAccess).toHaveBeenCalledOnce()
    expect(result.current.address).toBe("GABC1234")
    expect(result.current.connected).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it("sets error on freighter.requestAccess failure", async () => {
    mockFreighter.requestAccess.mockRejectedValue(new Error("User denied"))

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.address).toBeNull()
    expect(result.current.error).toBe("User denied")
  })
})

describe("useWallet - disconnect", () => {
  it("sets connected to false and stores DISCONNECTED_KEY in sessionStorage", async () => {
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

describe("useWallet - auto-reconnect on mount", () => {
  it("calls freighter.getAddress and sets address when found", async () => {
    mockFreighter.getAddress.mockResolvedValue({ address: "GXYZ5678" })

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFreighter.getAddress).toHaveBeenCalledOnce()
    expect(result.current.address).toBe("GXYZ5678")
    expect(result.current.connected).toBe(true)
  })

  it("does not set address when freighter.getAddress returns empty string", async () => {
    mockFreighter.getAddress.mockResolvedValue({ address: "" })

    const { result } = renderHook(() => useWallet())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.address).toBeNull()
    expect(result.current.connected).toBe(false)
  })

  it("does not call freighter.getAddress when DISCONNECTED_KEY is set", async () => {
    sessionStorage.setItem(DISCONNECTED_KEY, "true")
    mockFreighter.getAddress.mockResolvedValue({ address: "GXYZ5678" })

    renderHook(() => useWallet())

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFreighter.getAddress).not.toHaveBeenCalled()
  })
})
