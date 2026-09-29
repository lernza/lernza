import { useRef } from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useFocusTrap, getFocusableElements } from "./use-focus-trap"

interface HarnessProps {
  isActive: boolean
  onEscape?: () => void
  restoreFocus?: boolean
  useInitialFocus?: boolean
  /** Trailing disabled button — must not be treated as the last tab stop. */
  trailingDisabled?: boolean
  noFocusableChildren?: boolean
}

function Harness({
  isActive,
  onEscape,
  restoreFocus,
  useInitialFocus,
  trailingDisabled,
  noFocusableChildren,
}: HarnessProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialRef = useRef<HTMLButtonElement>(null)

  useFocusTrap(containerRef, {
    isActive,
    onEscape,
    restoreFocus,
    initialFocusRef: useInitialFocus ? initialRef : undefined,
  })

  return (
    <div>
      <button type="button">Open dialog</button>
      {isActive && (
        <div ref={containerRef} tabIndex={-1} data-testid="container">
          {noFocusableChildren ? (
            <span>no controls here</span>
          ) : (
            <>
              <button type="button">Add first</button>
              {useInitialFocus && (
                <button type="button" ref={initialRef}>
                  Set initial
                </button>
              )}
              {trailingDisabled ? (
                <>
                  <button type="button">Save second</button>
                  <button type="button" disabled>
                    Delete trailing
                  </button>
                </>
              ) : (
                <button type="button">Submit last</button>
              )}
            </>
          )}
        </div>
      )}
      <button type="button">Close outside</button>
    </div>
  )
}

const trigger = () => screen.getByRole("button", { name: "Open dialog" })
const first = () => screen.getByRole("button", { name: "Add first" })
const initial = () => screen.getByRole("button", { name: "Set initial" })
const second = () => screen.getByRole("button", { name: "Save second" })
const last = () => screen.getByRole("button", { name: "Submit last" })
const outside = () => screen.getByRole("button", { name: "Close outside" })
const container = () => screen.getByTestId("container")

/** Dispatches a keydown on document and reports whether it was default-prevented. */
function pressKey(key: string, shiftKey = false): boolean {
  const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event.defaultPrevented
}

describe("getFocusableElements", () => {
  it("excludes disabled, aria-disabled and tabindex=-1 elements", () => {
    const host = document.createElement("div")
    host.innerHTML = `
      <button>a</button>
      <button disabled>b</button>
      <button tabindex="-1">c</button>
      <button aria-disabled="true">d</button>
      <a href="#">e</a>
      <input />
      <select></select>
      <textarea></textarea>
    `
    expect(getFocusableElements(host).map(el => el.tagName)).toEqual([
      "BUTTON",
      "A",
      "INPUT",
      "SELECT",
      "TEXTAREA",
    ])
  })

  it("excludes elements inside a disabled fieldset and hidden subtrees", () => {
    const host = document.createElement("div")
    host.innerHTML = `
      <fieldset disabled><button>in fieldset</button></fieldset>
      <div hidden><button>in hidden</button></div>
      <div aria-hidden="true"><button>in aria-hidden</button></div>
      <button>visible</button>
    `
    expect(getFocusableElements(host).map(el => el.textContent)).toEqual(["visible"])
  })
})

describe("useFocusTrap", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("moves focus into the dialog on open", () => {
    render(<Harness isActive />)
    expect(document.activeElement).toBe(first())
  })

  it("moves focus to the requested initial element", () => {
    render(<Harness isActive useInitialFocus />)
    expect(document.activeElement).toBe(initial())
  })

  it("falls back to the container when the dialog has no focusable children", () => {
    render(<Harness isActive noFocusableChildren />)
    expect(document.activeElement).toBe(container())
  })

  it("does not move focus while inactive", () => {
    render(<Harness isActive={false} />)
    expect(screen.queryByTestId("container")).toBeNull()
    expect(document.activeElement).toBe(document.body)
  })

  it("wraps Tab from the last element back to the first", () => {
    render(<Harness isActive />)
    last().focus()

    expect(pressKey("Tab")).toBe(true)
    expect(document.activeElement).toBe(first())
  })

  it("wraps Shift+Tab from the first element back to the last", () => {
    render(<Harness isActive />)
    first().focus()

    expect(pressKey("Tab", true)).toBe(true)
    expect(document.activeElement).toBe(last())
  })

  it("does not intercept Tab in the middle of the dialog", () => {
    render(<Harness isActive />)
    first().focus()

    expect(pressKey("Tab")).toBe(false)
  })

  it("treats a trailing disabled button as unreachable, so focus still wraps", () => {
    render(<Harness isActive trailingDisabled />)
    // "Save second" is the last *reachable* control; the disabled button after
    // it must not be treated as the boundary or Tab would escape the dialog.
    second().focus()

    expect(pressKey("Tab")).toBe(true)
    expect(document.activeElement).toBe(first())
  })

  it("pulls focus back in when it has escaped the dialog", () => {
    render(<Harness isActive />)
    outside().focus()

    expect(pressKey("Tab")).toBe(true)
    expect(document.activeElement).toBe(first())
  })

  it("pulls focus to the last element on Shift+Tab when focus has escaped", () => {
    render(<Harness isActive />)
    outside().focus()

    expect(pressKey("Tab", true)).toBe(true)
    expect(document.activeElement).toBe(last())
  })

  it("calls onEscape when Escape is pressed", () => {
    const onEscape = vi.fn()
    render(<Harness isActive onEscape={onEscape} />)

    pressKey("Escape")
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it("ignores Escape when no handler is supplied", () => {
    render(<Harness isActive />)

    expect(pressKey("Escape")).toBe(false)
  })

  it("stops handling keys once the dialog closes", () => {
    const onEscape = vi.fn()
    const { rerender } = render(<Harness isActive onEscape={onEscape} />)

    rerender(<Harness isActive={false} onEscape={onEscape} />)
    pressKey("Escape")

    expect(onEscape).not.toHaveBeenCalled()
  })

  it("returns focus to the trigger on close", () => {
    // Mirror the real flow: the trigger holds focus, then the dialog opens.
    const { rerender } = render(<Harness isActive={false} />)
    trigger().focus()

    rerender(<Harness isActive />)
    expect(document.activeElement).toBe(first())

    rerender(<Harness isActive={false} />)
    expect(document.activeElement).toBe(trigger())
  })

  it("leaves focus alone on close when restoreFocus is disabled", () => {
    const { rerender } = render(<Harness isActive={false} restoreFocus={false} />)
    trigger().focus()

    rerender(<Harness isActive restoreFocus={false} />)
    rerender(<Harness isActive={false} restoreFocus={false} />)

    expect(document.activeElement).not.toBe(trigger())
  })

  it("does not re-steal focus when re-rendered while open", () => {
    const onEscape = vi.fn()
    const { rerender } = render(<Harness isActive onEscape={onEscape} />)
    last().focus()

    rerender(<Harness isActive onEscape={onEscape} />)
    expect(document.activeElement).toBe(last())
  })

  it("survives the trigger being removed before the dialog closes", () => {
    const { rerender } = render(<Harness isActive />)
    trigger().remove()

    expect(() => rerender(<Harness isActive={false} />)).not.toThrow()
  })

  it("keeps focus inside the dialog when focus lands on an outside control", () => {
    render(<Harness isActive />)
    // Simulates focus landing outside, as happens when the backdrop is clicked.
    outside().focus()

    fireEvent.keyDown(document, { key: "Tab" })
    expect(container()).toContainElement(document.activeElement as HTMLElement)
  })
})
