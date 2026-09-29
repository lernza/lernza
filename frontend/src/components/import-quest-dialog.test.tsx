import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { axe } from "vitest-axe"
import { ImportQuestDialog } from "./import-quest-dialog"
import type { ParsedMilestone } from "@/pages/create-quest/csv-parser"

const milestones: ParsedMilestone[] = [
  { title: "Milestone 1", description: "First description", rewardAmount: 50 },
  { title: "Milestone 2", description: "Second description", rewardAmount: 25 },
]

function renderDialog(overrides: Partial<Parameters<typeof ImportQuestDialog>[0]> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    milestones,
    mode: "append" as const,
    existingCount: 1,
    questName: "Test Quest",
    ...overrides,
  }
  return { ...render(<ImportQuestDialog {...props} />), props }
}

const dialog = () => screen.getByRole("dialog")

describe("ImportQuestDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when closed", () => {
    renderDialog({ isOpen: false })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders nothing when there are no milestones to import", () => {
    renderDialog({ milestones: [] })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("exposes modal dialog semantics labelled by its heading", () => {
    renderDialog()
    expect(dialog()).toHaveAttribute("aria-modal", "true")
    expect(dialog()).toHaveAccessibleName("Review Imported Milestones")
  })

  describe("focus management (WCAG 2.1 SC 2.4.3)", () => {
    it("autofocuses the confirm button on open", () => {
      renderDialog()
      expect(screen.getByRole("button", { name: /add these milestones/i })).toHaveFocus()
    })

    it("returns focus to the trigger when it closes", () => {
      const trigger = document.createElement("button")
      document.body.appendChild(trigger)
      trigger.focus()

      const { rerender, props } = renderDialog()
      expect(screen.getByRole("button", { name: /add these milestones/i })).toHaveFocus()

      rerender(<ImportQuestDialog {...props} isOpen={false} />)

      expect(document.activeElement).toBe(trigger)
      trigger.remove()
    })

    it("traps Tab within the dialog", () => {
      renderDialog()
      const focusable = Array.from(dialog().querySelectorAll<HTMLElement>("button:not([disabled])"))
      focusable[focusable.length - 1].focus()

      const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    })
  })

  it("closes on Escape", () => {
    const { props } = renderDialog()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it("closes from the close button", () => {
    const { props } = renderDialog()
    fireEvent.click(screen.getByLabelText("Close import review"))
    expect(props.onClose).toHaveBeenCalled()
  })

  it("confirms the import", () => {
    const { props } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: /add these milestones/i }))
    expect(props.onConfirm).toHaveBeenCalled()
  })

  it("has no detectable axe violations", async () => {
    const { container } = renderDialog()
    expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
  })
})
