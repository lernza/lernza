import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { axe } from "vitest-axe"
import { Dialog, DialogContent, DialogTitle } from "./dialog"

function renderDialog(
  props: Partial<Parameters<typeof Dialog>[0]> = {},
  content: React.ReactNode = <button type="button">Open panel</button>
) {
  const merged = { open: true, onOpenChange: vi.fn(), children: null, ...props }
  const utils = render(
    <Dialog {...merged}>
      <DialogContent>
        <DialogTitle>Example</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  )
  return { ...utils, onOpenChange: merged.onOpenChange }
}

const dialog = () => screen.getByRole("dialog")

describe("ui/dialog focus management", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when closed", () => {
    renderDialog({ open: false })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("exposes modal semantics labelled by DialogTitle", () => {
    renderDialog()
    expect(dialog()).toHaveAttribute("aria-modal", "true")
    expect(dialog()).toHaveAccessibleName("Example")
  })

  it("is programmatically focusable as a fallback", () => {
    renderDialog()
    expect(dialog()).toHaveAttribute("tabindex", "-1")
  })

  it("moves focus into the dialog on open", () => {
    renderDialog()
    expect(screen.getByRole("button", { name: "Open panel" })).toHaveFocus()
  })

  it("focuses the container itself when it has no focusable children", () => {
    renderDialog({}, <span>Nothing focusable</span>)
    expect(dialog()).toHaveFocus()
  })

  it("returns focus to the trigger when it closes", async () => {
    const trigger = document.createElement("button")
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender, onOpenChange } = renderDialog()
    rerender(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    )

    await waitFor(() => expect(document.activeElement).toBe(trigger))
    trigger.remove()
  })

  it("traps Tab within the dialog", () => {
    renderDialog({}, <><button type="button">Save changes</button><button type="button">Close panel</button></>)
    const focusable = Array.from(dialog().querySelectorAll<HTMLElement>("button:not([disabled])"))
    focusable[focusable.length - 1].focus()

    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(dialog()).toContainElement(document.activeElement as HTMLElement)
  })

  it("traps Shift+Tab within the dialog", () => {
    renderDialog({}, <><button type="button">Save changes</button><button type="button">Close panel</button></>)
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
      new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true })
    )

    expect(dialog()).toContainElement(document.activeElement as HTMLElement)
    outside.remove()
  })

  it("closes on Escape", async () => {
    const { onOpenChange } = renderDialog()

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("has no detectable axe violations", async () => {
    const { container } = renderDialog()
    expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
  })
})
