import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { I18nProvider } from "@/i18n"
import { QuestCreationProvider, useQuestCreation, DRAFT_STORAGE_KEY } from "./context"
import { CreateQuest } from "./index"

// Mock useWallet
vi.mock("@/hooks/use-wallet", () => ({
  useWallet: () => ({
    connected: true,
    connect: vi.fn(),
    loading: false,
  }),
}))

// Test consumer to control and assert draft states
function TestDraftConsumer() {
  const {
    step1Data,
    setStep1Data,
    lastSaved,
    hasConflict,
    hasDraftToRestore,
    saveDraft,
    restoreDraft,
    clearDraft,
  } = useQuestCreation()

  return (
    <div>
      <div data-testid="quest-name">{step1Data.name}</div>
      <div data-testid="last-saved">{lastSaved ? lastSaved.toISOString() : "none"}</div>
      <div data-testid="conflict-flag">{hasConflict ? "conflict" : "clean"}</div>
      <div data-testid="restore-flag">{hasDraftToRestore ? "restore-available" : "none"}</div>
      <button onClick={() => setStep1Data({ ...step1Data, name: "New Auto-Saved Quest" })}>
        Update Name
      </button>
      <button onClick={saveDraft}>Save Now</button>
      <button onClick={restoreDraft}>Restore Now</button>
      <button onClick={clearDraft}>Clear Now</button>
    </div>
  )
}

const storageMap = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
}
Object.defineProperty(window, "localStorage", { value: mockLocalStorage, writable: true })

describe("Quest Draft Auto-Save with Conflict Detection (Issue #1640)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMap.clear()
  })

  afterEach(() => {
    storageMap.clear()
  })

  it("saves draft to localStorage and updates lastSaved time", () => {
    render(
      <QuestCreationProvider>
        <TestDraftConsumer />
      </QuestCreationProvider>
    )

    expect(screen.getByTestId("last-saved").textContent).toBe("none")

    // Update form
    fireEvent.click(screen.getByText("Update Name"))
    fireEvent.click(screen.getByText("Save Now"))

    expect(screen.getByTestId("last-saved").textContent).not.toBe("none")

    const savedRaw = localStorage.getItem(DRAFT_STORAGE_KEY)
    expect(savedRaw).not.toBeNull()
    const parsed = JSON.parse(savedRaw!)
    expect(parsed.step1Data.name).toBe("New Auto-Saved Quest")
    expect(parsed.tabId).toBeDefined()
  })

  it("detects multi-tab editing conflict when external storage event fires", () => {
    render(
      <QuestCreationProvider>
        <TestDraftConsumer />
      </QuestCreationProvider>
    )

    expect(screen.getByTestId("conflict-flag").textContent).toBe("clean")

    // Simulate storage event from another tab
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: DRAFT_STORAGE_KEY,
          newValue: JSON.stringify({
            step1Data: { name: "Edited from Tab B", description: "", category: "", tags: [] },
            step2Data: { milestones: [] },
            currentStep: 1,
            updatedAt: Date.now(),
            tabId: "tab-b-external-id",
          }),
        })
      )
    })

    expect(screen.getByTestId("conflict-flag").textContent).toBe("conflict")
  })

  it("prompts draft recovery on mount when existing draft is in localStorage and restores it", () => {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        step1Data: { name: "Restored Ancient Quest", description: "Old desc", category: "Web3", tags: [] },
        step2Data: { milestones: [{ title: "M1", description: "D1", rewardAmount: 10 }] },
        currentStep: 1,
        updatedAt: Date.now() - 60000,
        tabId: "previous-session",
      })
    )

    render(
      <QuestCreationProvider>
        <TestDraftConsumer />
      </QuestCreationProvider>
    )

    expect(screen.getByTestId("restore-flag").textContent).toBe("restore-available")

    // Trigger restore
    fireEvent.click(screen.getByText("Restore Now"))

    expect(screen.getByTestId("quest-name").textContent).toBe("Restored Ancient Quest")
    expect(screen.getByTestId("restore-flag").textContent).toBe("none")
  })

  it("renders draft recovery banner and auto-save indicator in CreateQuest page", () => {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        step1Data: { name: "Unsaved Draft Quest", description: "Desc", category: "", tags: [] },
        step2Data: { milestones: [] },
        currentStep: 1,
        updatedAt: Date.now(),
        tabId: "session-1",
      })
    )

    render(
      <I18nProvider>
        <QuestCreationProvider>
          <CreateQuest onBack={vi.fn()} />
        </QuestCreationProvider>
      </I18nProvider>
    )

    expect(screen.getByText(/Unsaved draft found/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Restore Draft/i })).toBeInTheDocument()
    expect(screen.getByTestId("draft-status-indicator")).toBeInTheDocument()
  })
})
