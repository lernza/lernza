import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useToast } from "./use-toast"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useToast – addToast", () => {
  it("adds a toast to the list", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Hello, world!")
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe("Hello, world!")
  })

  it("defaults to type 'success' and duration 3000ms", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Done!")
    })

    expect(result.current.toasts[0].type).toBe("success")
    expect(result.current.toasts[0].duration).toBe(3000)
  })

  it("accepts a custom type and duration", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Oops", "error", 5000)
    })

    expect(result.current.toasts[0].type).toBe("error")
    expect(result.current.toasts[0].duration).toBe(5000)
  })

  it("assigns a unique id to each toast", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("First")
      result.current.addToast("Second")
    })

    const ids = result.current.toasts.map(t => t.id)
    expect(new Set(ids).size).toBe(2)
  })

  it("supports multiple toasts at once", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("A")
      result.current.addToast("B")
      result.current.addToast("C")
    })

    expect(result.current.toasts).toHaveLength(3)
  })
})

describe("useToast – auto-dismiss", () => {
  it("removes the toast after the specified duration", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Auto dismiss me", "info", 2000)
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it("does not dismiss before the duration has elapsed", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Still here", "info", 3000)
    })

    act(() => {
      vi.advanceTimersByTime(2999)
    })

    expect(result.current.toasts).toHaveLength(1)
  })

  it("only removes the expired toast when multiple are present", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Short", "success", 1000)
      result.current.addToast("Long", "success", 5000)
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe("Long")
  })
})

describe("useToast – removeToast", () => {
  it("removes a toast by id before its timer fires", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Remove me manually")
    })

    const id = result.current.toasts[0].id

    act(() => {
      result.current.removeToast(id)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it("is a no-op when the id does not exist", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Stays")
    })

    act(() => {
      result.current.removeToast("non-existent-id")
    })

    expect(result.current.toasts).toHaveLength(1)
  })

  it("only removes the matching toast when multiple are present", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.addToast("Keep A")
      result.current.addToast("Remove B")
    })

    const idToRemove = result.current.toasts[1].id

    act(() => {
      result.current.removeToast(idToRemove)
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe("Keep A")
  })
})
