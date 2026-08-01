import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

// Mock the contracts client module to prevent it from instantiating a Soroban
// RPC server at import time (which throws in a jsdom environment).
vi.mock("@/lib/contracts/client", () => ({
  isTransactionTimeboundsValid: (tb: { minTime: number; maxTime: number }) => {
    const now = Math.floor(Date.now() / 1000)
    if (now < tb.minTime) return false
    if (tb.maxTime > 0 && now > tb.maxTime) return false
    return true
  },
  getTransactionTimebounds: (tx: { timeBounds?: { minTime: string; maxTime: string } | null }) => {
    if (!tx.timeBounds) return null
    return {
      minTime: parseInt(tx.timeBounds.minTime, 10),
      maxTime: parseInt(tx.timeBounds.maxTime, 10),
    }
  },
}))

import { useTransactionTimebounds } from "./use-transaction-timebounds"
import type { Transaction } from "@stellar/stellar-sdk"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNow(): number {
  return Math.floor(Date.now() / 1000)
}

/** Build a minimal Transaction stub with controlled timebounds. */
function makeTx(minTime: number, maxTime: number): Transaction {
  return {
    timeBounds: {
      minTime: String(minTime),
      maxTime: String(maxTime),
    },
  } as unknown as Transaction
}

/** Dispatch a visibilitychange event and update the visibilityState property. */
function simulateVisibilityChange(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  })
  document.dispatchEvent(new Event("visibilitychange"))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useTransactionTimebounds – initial state", () => {
  it("returns valid=true when no transaction is supplied", () => {
    const { result } = renderHook(() => useTransactionTimebounds(null))
    expect(result.current.isValid).toBe(true)
  })

  it("marks a future transaction as valid", () => {
    const now = makeNow()
    const tx = makeTx(0, now + 300) // expires in 5 min
    const { result } = renderHook(() => useTransactionTimebounds(tx))
    expect(result.current.isValid).toBe(true)
    expect(result.current.timeRemaining).toBeGreaterThan(0)
  })

  it("marks an already-expired transaction as invalid", () => {
    const now = makeNow()
    const tx = makeTx(0, now - 60) // expired 1 min ago
    const { result } = renderHook(() => useTransactionTimebounds(tx))
    expect(result.current.isValid).toBe(false)
    expect(result.current.reason).toMatch(/expired/i)
  })

  it("marks a too-early transaction as invalid", () => {
    const now = makeNow()
    const tx = makeTx(now + 120, now + 300) // not valid yet
    const { result } = renderHook(() => useTransactionTimebounds(tx))
    expect(result.current.isValid).toBe(false)
    expect(result.current.reason).toMatch(/not yet valid/i)
  })
})

describe("useTransactionTimebounds – periodic interval", () => {
  it("detects expiry when the 10-second interval fires", () => {
    const now = makeNow()
    // Expires in 5 seconds; we'll advance 10 s to trigger the interval
    const tx = makeTx(0, now + 5)
    const { result } = renderHook(() => useTransactionTimebounds(tx))

    expect(result.current.isValid).toBe(true)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(result.current.isValid).toBe(false)
  })
})

describe("useTransactionTimebounds – visibilitychange re-sync", () => {
  it("re-checks timebounds immediately when tab becomes visible", () => {
    const now = makeNow()
    // Transaction expires in 5 seconds
    const tx = makeTx(0, now + 5)
    const { result } = renderHook(() => useTransactionTimebounds(tx))

    expect(result.current.isValid).toBe(true)

    // Simulate 30 s passing during background (interval is throttled/paused)
    act(() => {
      vi.setSystemTime(Date.now() + 30_000)
    })

    // Tab comes back to foreground — should re-check immediately
    act(() => {
      simulateVisibilityChange("visible")
    })

    expect(result.current.isValid).toBe(false)
    expect(result.current.reason).toMatch(/expired/i)
  })

  it("does not alter state on visibilitychange → hidden", () => {
    const now = makeNow()
    const tx = makeTx(0, now + 300)
    const { result } = renderHook(() => useTransactionTimebounds(tx))

    const before = result.current

    act(() => {
      simulateVisibilityChange("hidden")
    })

    // State should be unchanged
    expect(result.current.isValid).toBe(before.isValid)
  })
})

describe("useTransactionTimebounds – cleanup", () => {
  it("removes visibilitychange listener and clears interval on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener")
    const clearSpy = vi.spyOn(globalThis, "clearInterval")

    const now = makeNow()
    const tx = makeTx(0, now + 300)
    const { unmount } = renderHook(() => useTransactionTimebounds(tx))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
    expect(clearSpy).toHaveBeenCalled()

    removeSpy.mockRestore()
    clearSpy.mockRestore()
  })
})
