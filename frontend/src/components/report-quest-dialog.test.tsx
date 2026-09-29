import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { axe } from "vitest-axe"
import { ReportQuestDialog } from "./report-quest-dialog"

function renderDialog(
  overrides: Partial<Parameters<typeof ReportQuestDialog>[0]> = {}
) {
  const props = {
    isOpen: true,
    questId: 7,
    questName: "Stellar Basics",
    onClose: vi.fn(),
    ...overrides,
  }
  return { ...render(<ReportQuestDialog {...props} />), props }
}

const dialog = () => screen.getByRole("dialog")

describe("ReportQuestDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when closed", () => {
    renderDialog({ isOpen: false })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("exposes modal dialog semantics labelled by its heading and description", () => {
    renderDialog()
    expect(dialog()).toHaveAttribute("aria-modal", "true")
    expect(dialog()).toHaveAccessibleName("Report Quest")
    expect(dialog()).toHaveAccessibleDescription(
      "Choose a reason so our moderation team can review this quest."
    )
  })

  it("is programmatically focusable as a fallback", () => {
    renderDialog()
    expect(dialog()).toHaveAttribute("tabindex", "-1")
  })

  it("offers every report reason and the quest under report", () => {
    renderDialog()
    expect(screen.getByText("Stellar Basics")).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(6)
  })

  describe("focus management (WCAG 2.1 SC 2.4.3)", () => {
    it("moves focus into the dialog on open, onto the first reason", () => {
      renderDialog()
      // The close button is first in DOM order, but the first reason is the
      // meaningful starting point for the task.
      expect(screen.getByRole("radio", { name: "Spam or misleading content" })).toHaveFocus()
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    })

    it("returns focus to the trigger when it closes", async () => {
      const trigger = document.createElement("button")
      document.body.appendChild(trigger)
      trigger.focus()

      const { rerender, props } = renderDialog()
      rerender(<ReportQuestDialog {...props} isOpen={false} />)

      await waitFor(() => expect(document.activeElement).toBe(trigger))
      trigger.remove()
    })

    it("traps Tab within the dialog", () => {
      renderDialog()
      const focusable = Array.from(
        dialog().querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
        )
      )
      const last = focusable[focusable.length - 1]
      last.focus()

      const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    })

    it("traps Shift+Tab within the dialog", () => {
      renderDialog()
      const focusable = Array.from(
        dialog().querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
        )
      )
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
        new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
      )

      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
      outside.remove()
    })

    it("skips the disabled submit button when cycling", () => {
      renderDialog()
      // Submit is disabled until a reason is chosen, so it must not be a tab stop.
      const submit = screen.getByRole("button", { name: /Submit Report/ })
      expect(submit).toBeDisabled()
    })
  })

  describe("Escape", () => {
    it("closes the dialog", async () => {
      const { props } = renderDialog()

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      // handleClose is animated, so onClose lands on the next tick.
      await waitFor(() => expect(props.onClose).toHaveBeenCalled())
    })

    it("does not close while a report is in flight", async () => {
      const { props } = renderDialog()

      fireEvent.click(screen.getByRole("radio", { name: "Suspected scam or fraud" }))
      fireEvent.click(screen.getByRole("button", { name: /Submit Report/ }))
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Submitting/ })).toBeDisabled()
      )

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 250))
      expect(props.onClose).not.toHaveBeenCalled()
    })
  })

  it("closes when the close button is clicked", async () => {
    const { props } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Close report dialog" }))
    await waitFor(() => expect(props.onClose).toHaveBeenCalled())
  })

  it("has no detectable axe violations", async () => {
    const { container } = renderDialog()
    expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
  })
})
