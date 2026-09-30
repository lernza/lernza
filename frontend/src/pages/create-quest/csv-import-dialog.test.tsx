import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { axe } from "vitest-axe"
import { I18nProvider } from "@/i18n"
import { CsvImportDialog } from "./csv-import-dialog"

function renderDialog(overrides: Partial<Parameters<typeof CsvImportDialog>[0]> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onImport: vi.fn(),
    ...overrides,
  }
  return {
    ...render(
      <I18nProvider>
        <CsvImportDialog {...props} />
      </I18nProvider>
    ),
    props,
  }
}

const dialog = () => screen.getByRole("dialog")

/** Feeds a CSV through the file input and waits for parsing to settle. */
async function selectCsv(csv: string) {
  const input = screen.getByLabelText(/browse files/i) as HTMLInputElement
  const file = new File([csv], "milestones.csv", { type: "text/csv" })
  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => expect(screen.getByLabelText(/browse files/i)).toBeInTheDocument())
}

const validCsv = `title,description,rewardAmount
"Milestone 1","First description",50`

describe("CsvImportDialog", () => {
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
    expect(dialog()).toHaveAccessibleName("Import Milestones from CSV")
  })

  describe("focus management (WCAG 2.1 SC 2.4.3)", () => {
    it("autofocuses the file picker on open", () => {
      renderDialog()
      expect(screen.getByLabelText(/browse files/i)).toHaveFocus()
    })

    it("returns focus to the trigger when it closes", () => {
      const trigger = document.createElement("button")
      document.body.appendChild(trigger)
      trigger.focus()

      const { rerender, props } = renderDialog()
      expect(screen.getByLabelText(/browse files/i)).toHaveFocus()

      rerender(
        <I18nProvider>
          <CsvImportDialog {...props} isOpen={false} />
        </I18nProvider>
      )

      expect(document.activeElement).toBe(trigger)
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

    it("keeps the file picker reachable by keyboard", () => {
      renderDialog()
      // Regression guard: the input used to be `display: none`, which made it
      // impossible to focus and silently broke the initial focus target.
      const input = screen.getByLabelText(/browse files/i)
      expect(input).not.toHaveAttribute("hidden")
      input.focus()
      expect(input).toHaveFocus()
    })
  })

  describe("Escape", () => {
    it("closes the dialog", () => {
      const { props } = renderDialog()
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
      expect(props.onClose).toHaveBeenCalledTimes(1)
    })

    it("stops listening once closed", () => {
      const { props, rerender } = renderDialog()
      rerender(
        <I18nProvider>
          <CsvImportDialog {...props} isOpen={false} />
        </I18nProvider>
      )

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      expect(props.onClose).not.toHaveBeenCalled()
    })
  })

  it("imports parsed milestones and closes", async () => {
    const { props } = renderDialog()

    await selectCsv(validCsv)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /import 1 milestones/i })).toBeEnabled()
    )
    fireEvent.click(screen.getByRole("button", { name: /import 1 milestones/i }))

    expect(props.onImport).toHaveBeenCalledWith(
      [{ title: "Milestone 1", description: "First description", rewardAmount: 50 }],
      "append"
    )
    expect(props.onClose).toHaveBeenCalled()
  })

  it("announces parse errors assertively", async () => {
    renderDialog()
    await selectCsv(`title,description,rewardAmount
"Milestone 1","First description",not-a-number`)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveAttribute("aria-live", "assertive")
    expect(alert).toHaveTextContent(/csv parsing errors/i)
  })

  it("has no detectable axe violations", async () => {
    const { container } = renderDialog()
    expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
  })
})
