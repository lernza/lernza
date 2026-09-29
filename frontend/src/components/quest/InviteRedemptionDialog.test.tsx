import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { axe } from "vitest-axe"

const mockConnect = vi.fn()
const mockAddToast = vi.fn()

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: () => ({ address: "GADDRESS", connected: true, connect: mockConnect }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

vi.mock("@/lib/contracts/quest", () => ({
  questClient: { isInviteValid: vi.fn(), joinQuestWithInvite: vi.fn() },
}))

vi.mock("@/lib/invite-utils", () => ({
  hashInviteCode: vi.fn().mockResolvedValue("commitment"),
}))

const { InviteRedemptionDialog } = await import("./InviteRedemptionDialog")

function renderDialog(overrides: Partial<Parameters<typeof InviteRedemptionDialog>[0]> = {}) {
  const props = {
    questId: 7,
    questName: "Test Quest",
    inviteCode: "ABC123",
    onCancel: vi.fn(),
    ...overrides,
  }
  return { ...render(<InviteRedemptionDialog {...props} />), props }
}

const dialog = () => screen.getByRole("dialog")

describe("InviteRedemptionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("exposes modal dialog semantics labelled by its heading", () => {
    renderDialog()
    expect(dialog()).toHaveAttribute("aria-modal", "true")
    expect(dialog()).toHaveAccessibleName("Join Quest")
    expect(dialog()).toHaveAccessibleDescription(/invite to join/i)
  })

  describe("focus management (WCAG 2.1 SC 2.4.3)", () => {
    it("moves focus into the dialog on mount", () => {
      renderDialog()
      expect(dialog()).toContainElement(document.activeElement as HTMLElement)
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

  it("cancels on Escape", () => {
    const { props } = renderDialog()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it("cancels from the cancel button", () => {
    const { props } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it("announces a redemption failure assertively", async () => {
    const { questClient } = await import("@/lib/contracts/quest")
    vi.mocked(questClient.isInviteValid).mockResolvedValue(false)

    renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Redeem Invite" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/expired or already been redeemed/i)
  })

  it("has no detectable axe violations", async () => {
    const { container } = renderDialog()
    expect(await axe(container.ownerDocument.body)).toHaveNoViolations()
  })
})
