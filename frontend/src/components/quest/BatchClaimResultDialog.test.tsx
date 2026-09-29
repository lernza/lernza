import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { axe } from "vitest-axe"
import { BatchClaimResultDialog } from "./BatchClaimResultDialog"
import type { BatchClaimSummary } from "@/lib/contract-types"

const summary: BatchClaimSummary = {
  results: [
    { milestoneId: 1, milestoneTitle: "First milestone", status: "success", rewardAmount: 10n },
    { milestoneId: 2, milestoneTitle: "Second milestone", status: "failed", error: "reverted" },
  ],
  successCount: 1,
  failureCount: 1,
  totalAmount: 10n,
  questId: 7,
  enrollee: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
}

function renderDialog(overrides: Partial<Parameters<typeof BatchClaimResultDialog>[0]> = {}) {
  const props = {
    isOpen: true,
    summary,
    onClose: vi.fn(),
    onRetryFailed: vi.fn(),
    ...overrides,
  }
  return { ...render(<BatchClaimResultDialog {...props} />), props }
}

const dialog = () => screen.getByRole("dialog")

describe("BatchClaimResultDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when closed", () => {
    renderDialog({ isOpen: false })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("exposes modal dialog semantics labelled by its heading", () => {
    renderDialog()
    expect(dialog()).toHaveAttribute("aria-modal", "true")
    expect(dialog()).toHaveAccessibleName("Claim Results")
  })

  describe("focus management (WCAG 2.1 SC 2.4.3)", () => {
    it("autofocuses the primary action on open", () => {
      renderDialog()
      // The dialog focuses its primary action (here "Close", because one
      // milestone failed) rather than the header's dismiss control.
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus()
    })

    it("returns focus to the trigger when it closes", async () => {
      const trigger = document.createElement("button")
      document.body.appendChild(trigger)
      trigger.focus()

      const { rerender, props } = renderDialog()
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus()

      rerender(<BatchClaimResultDialog {...props} isOpen={false} />)

      await waitFor(() => expect(document.activeElement).toBe(trigger))
      trigger.remove()
    })

    it("traps Tab within the dialog", () => {
      renderDialog()
      const focusable = Array.from(dialog().querySelectorAll<HTMLElement>("button:not([disabled])"))
      const last = focusable[focusable.length - 1]
      last.focus()

      const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    })

    it("traps Shift+Tab within the dialog", () => {
      renderDialog()
      const focusable = Array.from(dialog().querySelectorAll<HTMLElement>("button:not([disabled])"))
      focusable[0].focus()

      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        cancelable: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    })

    it("pulls focus back in when it has escaped the dialog", () => {
      renderDialog()
      const outside = document.createElement("button")
      document.body.appendChild(outside)
      outside.focus()

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true }),
      )

      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
      outside.remove()
    })
  })

  describe("Escape", () => {
    it("closes the dialog", async () => {
      const { props } = renderDialog()

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      // handleClose is animated, so onClose lands on the next tick.
      await waitFor(() => expect(props.onClose).toHaveBeenCalled())
    })

    it("does not close while a retry is in flight", async () => {
      const { props } = renderDialog({ isRetrying: true })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 250))
      expect(props.onClose).not.toHaveBeenCalled()
    })
  })

  it("closes when the close button is clicked", async () => {
    const { props } = renderDialog()
    fireEvent.click(screen.getByLabelText("Close claim results dialog"))
    await waitFor(() => expect(props.onClose).toHaveBeenCalled())
  })

  it("has no detectable axe violations", async () => {
    const { container } = renderDialog()
    expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
  })
})
