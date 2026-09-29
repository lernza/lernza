import { useState } from "react"
import { describe, it, expect } from "vitest"
import { render, fireEvent, screen } from "@testing-library/react"
import { axe } from "vitest-axe"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"

function TestDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
        </DialogHeader>
        <button>Submit first</button>
        <button>Submit second</button>
        <DialogFooter>
          <button>Submit last</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TriggerAndDialog() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      {open && <TestDialog onOpenChange={setOpen} />}
    </>
  )
}

describe("Dialog focus management", () => {
  it("has no axe violations when open", async () => {
    const { container } = render(<TestDialog onOpenChange={() => {}} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it("has an accessible name pointing at the dialog title", () => {
    render(<TestDialog onOpenChange={() => {}} />)
    const dialog = screen.getByRole("dialog")
    const title = screen.getByText("Confirm action")
    expect(dialog).toHaveAttribute("aria-labelledby", title.id)
  })

  it("autofocuses the first focusable element on open", () => {
    render(<TestDialog onOpenChange={() => {}} />)
    expect(screen.getByText("Submit first")).toHaveFocus()
  })

  it("traps Tab focus within the dialog", () => {
    render(<TestDialog onOpenChange={() => {}} />)
    const last = screen.getByText("Submit last")
    last.focus()
    fireEvent.keyDown(window, { key: "Tab" })
    expect(screen.getByText("Submit first")).toHaveFocus()
  })

  it("wraps Shift+Tab from the first element to the last", () => {
    render(<TestDialog onOpenChange={() => {}} />)
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true })
    expect(screen.getByText("Submit last")).toHaveFocus()
  })

  it("calls onOpenChange(false) on Escape", () => {
    let open = true
    render(<TestDialog onOpenChange={v => (open = v)} />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(open).toBe(false)
  })

  it("returns focus to the trigger element on close", () => {
    render(<TriggerAndDialog />)
    const trigger = screen.getByText("Open dialog")
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByText("Submit first")).toHaveFocus()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(trigger).toHaveFocus()
  })
})
