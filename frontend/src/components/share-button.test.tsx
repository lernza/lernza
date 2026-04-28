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
      expect(mockOnToast).toHaveBeenCalledWith("Link copied to clipboard!", "success")
    })
  })

  it("uses fallbackCopyText in insecure contexts (navigator.clipboard undefined)", async () => {
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
      expect(document.execCommand).toHaveBeenCalledWith("copy")
      expect(mockOnToast).toHaveBeenCalledWith("Link copied to clipboard!", "success")
    })
  })

  it("uses fallbackCopyText when navigator.clipboard.writeText fails", async () => {
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
      expect(document.execCommand).toHaveBeenCalledWith("copy")
      expect(mockOnToast).toHaveBeenCalledWith("Link copied to clipboard!", "success")
    })
  })
})
