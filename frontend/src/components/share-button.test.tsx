import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ShareButton } from "./share-button"

describe("ShareButton Clipboard Fallback", () => {
  const mockOnToast = vi.fn()
  const questId = 123
  const questName = "Test Quest"

  let originalClipboard: unknown
  let originalIsSecureContext: unknown
  let originalExecCommand: unknown

  beforeEach(() => {
    vi.clearAllMocks()

    originalClipboard = navigator.clipboard
    originalIsSecureContext = window.isSecureContext
    originalExecCommand = document.execCommand

    // Default: secure context with clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })

    Object.defineProperty(window, "isSecureContext", {
      value: true,
      configurable: true,
    })

    document.execCommand = vi.fn().mockReturnValue(true)

    // Mock matchMedia
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    })
    Object.defineProperty(window, "isSecureContext", {
      value: originalIsSecureContext,
      configurable: true,
    })
    document.execCommand = originalExecCommand
  })

  it("uses navigator.clipboard.writeText in secure contexts", async () => {
    render(<ShareButton questId={questId} questName={questName} onToast={mockOnToast} />)

    const shareButton = screen.getByLabelText("Share quest")
    fireEvent.click(shareButton)

    const copyButton = screen.getByText("Copy Link")
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("http"))
      expect(mockOnToast).toHaveBeenCalledWith("Copied to clipboard!", "success")
    })
  })

  it("shows error toast when clipboard is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
    })

    render(<ShareButton questId={questId} questName={questName} onToast={mockOnToast} />)

    const shareButton = screen.getByLabelText("Share quest")
    fireEvent.click(shareButton)

    const copyButton = screen.getByText("Copy Link")
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockOnToast).toHaveBeenCalledWith(
        "Unable to copy to clipboard. Please try again.",
        "error",
        "error"
      )
    })
  })

  it("shows error toast when navigator.clipboard.writeText fails", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"))
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    })

    render(<ShareButton questId={questId} questName={questName} onToast={mockOnToast} />)

    const shareButton = screen.getByLabelText("Share quest")
    fireEvent.click(shareButton)

    const copyButton = screen.getByText("Copy Link")
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled()
      expect(mockOnToast).toHaveBeenCalledWith(
        "Unable to copy to clipboard. Please try again.",
        "error",
        "error"
      )
    })
  })
})

describe("ShareButton focus management (WCAG 2.1 SC 2.4.3)", () => {
  const onToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  const open = () => fireEvent.click(screen.getByLabelText("Share quest"))
  const panel = () => screen.getByRole("dialog")

  it("moves focus into the share panel on open", () => {
    render(<ShareButton questId={1} questName="Quest" onToast={onToast} />)
    open()

    expect(panel()).toContainElement(document.activeElement as HTMLElement)
  })

  it("returns focus to the trigger when the panel closes via Escape", () => {
    render(<ShareButton questId={1} questName="Quest" onToast={onToast} />)
    const trigger = screen.getByLabelText("Share quest")
    trigger.focus()

    open()
    expect(panel()).toContainElement(document.activeElement as HTMLElement)

    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it("returns focus to the trigger when the panel closes via its close button", () => {
    render(<ShareButton questId={1} questName="Quest" onToast={onToast} />)
    const trigger = screen.getByLabelText("Share quest")
    trigger.focus()

    open()
    fireEvent.click(screen.getByLabelText("Close share menu"))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it("traps Tab inside the panel", () => {
    render(<ShareButton questId={1} questName="Quest" onToast={onToast} />)
    open()

    const focusable = Array.from(panel().querySelectorAll<HTMLElement>("button:not([disabled])"))
    focusable[focusable.length - 1].focus()

    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(panel()).toContainElement(document.activeElement as HTMLElement)
  })

  it("leaves the panel unmarked as modal, since the page stays interactive", () => {
    render(<ShareButton questId={1} questName="Quest" onToast={onToast} />)
    open()

    expect(panel()).not.toHaveAttribute("aria-modal")
    expect(panel()).toHaveAccessibleName("Share options")
  })

  it("reports expanded state on the trigger", () => {
    render(<ShareButton questId={1} questName="Quest" onToast={onToast} />)
    const trigger = screen.getByLabelText("Share quest")

    expect(trigger).toHaveAttribute("aria-expanded", "false")
    open()
    expect(trigger).toHaveAttribute("aria-expanded", "true")
  })
})
