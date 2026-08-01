import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDeadlineCountdown } from "./use-deadline-countdown"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Unix-second timestamp that is `offsetSeconds` from Date.now(). */
function deadlineFromNow(offsetSeconds: number): number {
  return Math.floor(Date.now() / 1000) + offsetSeconds
}

/** Dispatch a synthetic visibilitychange event to simulate app resume. */
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
  // Start in visible state
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useDeadlineCountdown – initial value", () => {
  it("returns null when no deadline is provided", () => {
    const { result } = renderHook(() => useDeadlineCountdown(undefined))
    expect(result.current).toBeNull()
  })

  it("returns null for deadline = 0 (sentinel for no deadline)", () => {
    const { result } = renderHook(() => useDeadlineCountdown(0))
    expect(result.current).toBeNull()
  })

  it("returns correct seconds remaining on mount", () => {
    const deadline = deadlineFromNow(300) // 5 minutes in the future
    const { result } = renderHook(() => useDeadlineCountdown(deadline))
    // Should be within [298, 300] due to rounding
    expect(result.current).toBeGreaterThanOrEqual(298)
    expect(result.current).toBeLessThanOrEqual(300)
  })

  it("returns 0 (not negative) for an already-expired deadline", () => {
    const deadline = deadlineFromNow(-60) // 1 minute in the past
    const { result } = renderHook(() => useDeadlineCountdown(deadline))
    expect(result.current).toBe(0)
  })
})

describe("useDeadlineCountdown – interval ticking", () => {
  it("decrements by 1 each second", () => {
    const deadline = deadlineFromNow(10)
    const { result } = renderHook(() => useDeadlineCountdown(deadline))

    const initial = result.current!

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(initial - 1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(initial - 2)
  })

  it("floors at 0 after the deadline passes", () => {
    const deadline = deadlineFromNow(2)
    const { result } = renderHook(() => useDeadlineCountdown(deadline))

    act(() => {
      vi.advanceTimersByTime(5000) // advance past the deadline
    })

    expect(result.current).toBe(0)
  })
})

describe("useDeadlineCountdown – visibilitychange re-sync", () => {
  it("refreshes the countdown when the tab becomes visible again", () => {
    // Deadline is 100 seconds from now
    const deadline = deadlineFromNow(100)
    const { result } = renderHook(() => useDeadlineCountdown(deadline))

    // Simulate 60 seconds elapsing while the browser throttled the interval
    act(() => {
      // Move the wall clock forward but don't advance intervals (simulates suspension)
      vi.setSystemTime(Date.now() + 60_000)
    })

    // The interval hasn't fired yet — value may still be stale.
    // Now the user brings the tab back to the foreground.
    act(() => {
      simulateVisibilityChange("visible")
    })

    // After re-sync, remaining time should be ~40 s (100 - 60)
    expect(result.current).toBeGreaterThanOrEqual(38)
    expect(result.current).toBeLessThanOrEqual(41)
  })

  it("does not update when the tab is hidden", () => {
    const deadline = deadlineFromNow(100)
    const { result } = renderHook(() => useDeadlineCountdown(deadline))
    const before = result.current

    act(() => {
      simulateVisibilityChange("hidden")
    })

    // Value should not change on 'hidden' event
    expect(result.current).toBe(before)
  })
})

describe("useDeadlineCountdown – cleanup", () => {
  it("removes the visibilitychange listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener")
    const deadline = deadlineFromNow(60)
    const { unmount } = renderHook(() => useDeadlineCountdown(deadline))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
    removeSpy.mockRestore()
  })

  it("clears the interval on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval")
    const deadline = deadlineFromNow(60)
    const { unmount } = renderHook(() => useDeadlineCountdown(deadline))

    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
