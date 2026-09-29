import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { axe } from "vitest-axe"
import { SocialShareModal } from "./social-share-modal"

const mockConfig = {
  title: "Quest Completed!",
  description: "You have successfully completed the quest",
  questName: "Blockchain Basics",
  achievementText: "I just completed",
  url: "https://example.com/quest/1",
}

describe("SocialShareModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders when open", () => {
    render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
    expect(screen.getByText("Share Your Achievement")).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    render(<SocialShareModal isOpen={false} config={mockConfig} onClose={vi.fn()} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("displays achievement details", () => {
    render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
    expect(screen.getByText("Quest Completed!")).toBeInTheDocument()
    expect(screen.getByText(/I just completed/)).toBeInTheDocument()
  })

  it("has X share button", () => {
    render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
    expect(screen.getByRole("button", { name: /share on x/i })).toBeInTheDocument()
  })

  it("has Discord share button", () => {
    render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
    expect(screen.getByRole("button", { name: /copy for discord/i })).toBeInTheDocument()
  })

  it("has copy to clipboard button", () => {
    render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
    expect(screen.getByRole("button", { name: /copy to clipboard/i })).toBeInTheDocument()
  })

  it("closes modal when close button clicked", () => {
    const onClose = vi.fn()
    render(<SocialShareModal isOpen={true} config={mockConfig} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("Close dialog"))
    expect(onClose).toHaveBeenCalled()
  })

  it("copies to clipboard when copy button clicked", async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /copy to clipboard/i }))
    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("https://example.com/quest/1"),
    )
  })

  describe("focus management (WCAG 2.1 SC 2.4.3)", () => {
    it("exposes modal dialog semantics labelled by its heading", () => {
      render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)

      const dialog = screen.getByRole("dialog")
      expect(dialog).toHaveAttribute("aria-modal", "true")
      expect(dialog).toHaveAccessibleName("Share Your Achievement")
    })

    it("moves focus into the dialog on open", () => {
      render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    })

    it("returns focus to the trigger on close", () => {
      const { rerender } = render(
        <SocialShareModal isOpen={false} config={mockConfig} onClose={vi.fn()} />,
      )
      const trigger = document.createElement("button")
      document.body.appendChild(trigger)
      trigger.focus()

      rerender(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)

      rerender(<SocialShareModal isOpen={false} config={mockConfig} onClose={vi.fn()} />)
      expect(document.activeElement).toBe(trigger)
      trigger.remove()
    })

    it("keeps Tab inside the dialog", () => {
      render(<SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />)

      const focusable = Array.from(
        dialog().querySelectorAll<HTMLElement>("button:not([disabled])"),
      )
      const last = focusable[focusable.length - 1]
      last.focus()

      const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    })

    it("closes on Escape", () => {
      const onClose = vi.fn()
      render(<SocialShareModal isOpen={true} config={mockConfig} onClose={onClose} />)

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("has no detectable axe violations", async () => {
      const { container } = render(
        <SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />,
      )

      expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
    })
  })
})

function dialog() {
  return screen.getByRole("dialog")
}
