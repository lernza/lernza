import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import type { ReactNode } from "react"
import { ToastContainer } from "./toast"
import { NotificationProvider, useNotifications } from "@/contexts/notification-context"
import type { NotificationToast } from "@/contexts/notification-context"

/**
 * Drives the notification context directly, so these tests exercise the store
 * `ToastContainer` actually reads.
 *
 * This file previously mocked `useToast` — a hook the component has never used
 * — and asserted Tailwind classes (`bg-green-100`, `bg-red-100`) that the
 * component has never applied, so all of it passed nothing and failed outright.
 * The component is rendered here through its real provider instead.
 */
function ContextSeeder({ toasts }: { toasts: Omit<NotificationToast, "id" | "createdAt">[] }) {
  const { addToast } = useNotifications()
  return (
    <button
      type="button"
      onClick={() => {
        for (const toast of toasts) addToast(toast)
      }}
    >
      Add test toasts
    </button>
  )
}

function renderWithContext(
  ui: ReactNode,
  contextToasts: Omit<NotificationToast, "id" | "createdAt">[] = []
) {
  return render(
    <NotificationProvider>
      {ui}
      <ContextSeeder toasts={contextToasts} />
    </NotificationProvider>
  )
}

/**
 * Adds the seeded toasts to the context store. They have to be handed to
 * `renderWithContext` first — the seeder reads them from a prop, so passing
 * them after render would seed whatever array it closed over instead.
 */
function seed() {
  act(() => {
    screen.getByRole("button", { name: "Add test toasts" }).click()
  })
}

describe("ToastContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it("renders nothing when both stores are empty", () => {
    renderWithContext(<ToastContainer />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Notifications")).not.toBeInTheDocument()
  })

  it("renders toasts from the notification context", () => {
    renderWithContext(<ToastContainer />, [{ message: "Milestone verified", type: "success" }])
    seed()

    expect(screen.getByText("Milestone verified")).toBeInTheDocument()
  })

  it("renders a toast's title alongside its message", () => {
    renderWithContext(<ToastContainer />, [
      { title: "Reward Distributed!", message: "500 XLM paid out" },
    ])
    seed()

    expect(screen.getByText("Reward Distributed!")).toBeInTheDocument()
    expect(screen.getByText("500 XLM paid out")).toBeInTheDocument()
  })

  /**
   * The regression this file guards. `App.tsx` and `pages/quest.tsx` both pass
   * the legacy `useToast` list, and the component used to resolve
   * `explicitToasts ?? context.toasts` — so every notification raised through
   * the context was shadowed and never appeared.
   */
  it("renders context toasts even when legacy toasts are passed explicitly", () => {
    renderWithContext(
      <ToastContainer
        toasts={[{ id: "legacy-1", message: "Legacy message" }]}
        onRemove={vi.fn()}
      />,
      [{ message: "Context message" }]
    )
    seed()

    expect(screen.getByText("Context message")).toBeInTheDocument()
    expect(screen.getByText("Legacy message")).toBeInTheDocument()
  })

  it("renders context toasts when passed an empty legacy list", () => {
    renderWithContext(<ToastContainer toasts={[]} onRemove={vi.fn()} />, [
      { message: "Context message" },
    ])
    seed()

    expect(screen.getByText("Context message")).toBeInTheDocument()
  })

  it("dispatches dismissal to the legacy store for a legacy toast", () => {
    const legacyRemove = vi.fn()
    renderWithContext(
      <ToastContainer
        toasts={[{ id: "legacy-1", message: "Legacy message" }]}
        onRemove={legacyRemove}
      />,
      [{ message: "Context message" }]
    )
    seed()

    vi.useFakeTimers()
    act(() => {
      fireEvent.click(screen.getAllByRole("button", { name: /dismiss/i })[1])
      vi.advanceTimersByTime(400)
    })
    vi.useRealTimers()

    // Context toasts are merged ahead of legacy ones, so the second dismiss
    // button is the legacy toast. Routing it to the context instead would leave
    // the legacy entry on screen with nothing left to close it.
    expect(legacyRemove).toHaveBeenCalledWith("legacy-1")
  })

  it("dispatches dismissal to the context for a context toast", () => {
    const legacyRemove = vi.fn()
    renderWithContext(
      <ToastContainer
        toasts={[{ id: "legacy-1", message: "Legacy message" }]}
        onRemove={legacyRemove}
      />,
      [{ message: "Context message" }]
    )
    seed()

    vi.useFakeTimers()
    act(() => {
      fireEvent.click(screen.getAllByRole("button", { name: /dismiss/i })[0])
      vi.advanceTimersByTime(400)
    })
    vi.useRealTimers()

    expect(legacyRemove).not.toHaveBeenCalled()
  })

  it("applies a type-specific accent", () => {
    renderWithContext(<ToastContainer />, [
      { message: "All good", type: "success" },
      { message: "Something broke", type: "error" },
    ])
    seed()

    const alerts = screen.getAllByRole("alert")
    expect(alerts[0]).toHaveClass("bg-success")
    expect(alerts[1]).toHaveClass("bg-destructive")
  })

  it("exposes toasts to assistive technology as alerts", () => {
    renderWithContext(<ToastContainer />, [{ message: "Accessible message" }])
    seed()

    expect(screen.getByRole("alert")).toHaveTextContent("Accessible message")
  })
})
