import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useOnboarding, ONBOARDING_STEPS, TOTAL_STEPS } from "./use-onboarding"

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_KEY = "lernza_onboarding_completed"
const STORAGE_STEP_KEY = "lernza_onboarding_step"

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_STEP_KEY)
}

beforeEach(() => {
  clearStorage()
})

afterEach(() => {
  clearStorage()
})

// ─── Initial state ───────────────────────────────────────────────────────────

describe("useOnboarding – initial state", () => {
  it("starts closed, on step 0, not completed", () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.currentStep).toBe(0)
    expect(result.current.completed).toBe(false)
  })

  it("reports the correct total steps", () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.totalSteps).toBe(TOTAL_STEPS)
    expect(TOTAL_STEPS).toBe(ONBOARDING_STEPS.length)
  })

  it("initial step data matches the first ONBOARDING_STEPS entry", () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.step).toEqual(ONBOARDING_STEPS[0])
  })

  it("isFirstStep is true on step 0", () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.isFirstStep).toBe(true)
  })

  it("isLastStep is false on step 0 when total > 1", () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.isLastStep).toBe(false)
  })

  it("reads completed=true from localStorage if already set", () => {
    localStorage.setItem(STORAGE_KEY, "true")
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.completed).toBe(true)
  })

  it("reads saved step index from localStorage", () => {
    localStorage.setItem(STORAGE_STEP_KEY, "2")
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.currentStep).toBe(2)
  })

  it("clamps out-of-range saved step to last valid index", () => {
    localStorage.setItem(STORAGE_STEP_KEY, "999")
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.currentStep).toBe(TOTAL_STEPS - 1)
  })

  it("clamps negative saved step to 0", () => {
    localStorage.setItem(STORAGE_STEP_KEY, "-5")
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.currentStep).toBe(0)
  })
})

// ─── open / close ────────────────────────────────────────────────────────────

describe("useOnboarding – open / close", () => {
  it("open() sets isOpen to true", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    expect(result.current.isOpen).toBe(true)
  })

  it("open(n) jumps to that step and opens", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(3) })
    expect(result.current.currentStep).toBe(3)
    expect(result.current.isOpen).toBe(true)
  })

  it("open() clamps negative index to 0", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(-5) })
    expect(result.current.currentStep).toBe(0)
  })

  it("open() clamps index beyond total to last step", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(999) })
    expect(result.current.currentStep).toBe(TOTAL_STEPS - 1)
  })

  it("close() sets isOpen to false without marking complete", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.close() })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.completed).toBe(false)
  })

  it("close() does not write completed to localStorage", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.close() })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

// ─── next / back ─────────────────────────────────────────────────────────────

describe("useOnboarding – next / back", () => {
  it("next() advances currentStep by 1", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.next() })
    expect(result.current.currentStep).toBe(1)
    expect(result.current.isOpen).toBe(true)
  })

  it("next() persists the new step index in localStorage", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.next() })
    expect(localStorage.getItem(STORAGE_STEP_KEY)).toBe("1")
  })

  it("next() from the last step closes and marks complete", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(TOTAL_STEPS - 1) })
    act(() => { result.current.next() })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.completed).toBe(true)
  })

  it("next() from last step persists completed in localStorage", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(TOTAL_STEPS - 1) })
    act(() => { result.current.next() })
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true")
  })

  it("back() decrements currentStep by 1", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(2) })
    act(() => { result.current.back() })
    expect(result.current.currentStep).toBe(1)
  })

  it("back() on step 0 stays at 0", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(0) })
    act(() => { result.current.back() })
    expect(result.current.currentStep).toBe(0)
  })

  it("step data reflects the current step after next()", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.next() })
    expect(result.current.step).toEqual(ONBOARDING_STEPS[1])
  })

  it("isLastStep is true on the final step", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(TOTAL_STEPS - 1) })
    expect(result.current.isLastStep).toBe(true)
  })

  it("isFirstStep becomes false after advancing past step 0", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.next() })
    expect(result.current.isFirstStep).toBe(false)
  })
})

// ─── skip ─────────────────────────────────────────────────────────────────────

describe("useOnboarding – skip", () => {
  it("skip() closes the tutorial", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.skip() })
    expect(result.current.isOpen).toBe(false)
  })

  it("skip() marks the tutorial as completed", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.skip() })
    expect(result.current.completed).toBe(true)
  })

  it("skip() persists completed=true in localStorage", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open() })
    act(() => { result.current.skip() })
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true")
  })
})

// ─── complete ────────────────────────────────────────────────────────────────

describe("useOnboarding – complete", () => {
  it("complete() closes and marks the tutorial done", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(TOTAL_STEPS - 1) })
    act(() => { result.current.complete() })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.completed).toBe(true)
  })

  it("complete() persists the completed flag to localStorage", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.complete() })
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true")
  })

  it("complete() clears the saved step from localStorage", () => {
    localStorage.setItem(STORAGE_STEP_KEY, "3")
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.complete() })
    expect(localStorage.getItem(STORAGE_STEP_KEY)).toBeNull()
  })
})

// ─── reset ───────────────────────────────────────────────────────────────────

describe("useOnboarding – reset", () => {
  it("reset() clears the completed flag", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.complete() })
    act(() => { result.current.reset() })
    expect(result.current.completed).toBe(false)
  })

  it("reset() returns to step 0", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.open(3) })
    act(() => { result.current.reset() })
    expect(result.current.currentStep).toBe(0)
  })

  it("reset() clears both localStorage keys", () => {
    localStorage.setItem(STORAGE_KEY, "true")
    localStorage.setItem(STORAGE_STEP_KEY, "3")
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.reset() })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(STORAGE_STEP_KEY)).toBeNull()
  })

  it("after reset(), open() shows the tutorial again from step 0", () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => { result.current.skip() })
    act(() => { result.current.reset() })
    act(() => { result.current.open() })
    expect(result.current.isOpen).toBe(true)
    expect(result.current.completed).toBe(false)
    expect(result.current.currentStep).toBe(0)
  })
})

// ─── ONBOARDING_STEPS data integrity ─────────────────────────────────────────

describe("ONBOARDING_STEPS – data integrity", () => {
  it("has at least 4 steps", () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThanOrEqual(4)
  })

  it("every step has a non-empty id, title, and description", () => {
    for (const step of ONBOARDING_STEPS) {
      expect(step.id.trim()).not.toBe("")
      expect(step.title.trim()).not.toBe("")
      expect(step.description.trim()).not.toBe("")
    }
  })

  it("all step ids are unique", () => {
    const ids = ONBOARDING_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
