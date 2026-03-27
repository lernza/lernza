import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

vi.mock("./dashboard/earnings-chart", () => ({
  default: () => null,
}))

vi.mock("@/hooks/use-async-data", () => ({
  useContractData: () => ({
    data: {
      quests: [
        {
          id: 7,
          owner: "GOWNER",
          name: "Quest Alpha",
          description: "Frontend integration quest",
          tokenAddr: "TOKEN",
          createdAt: 123,
          visibility: 0,
          status: 0,
          deadline: 0,
          maxEnrollees: 10,
        },
        {
          id: 8,
          owner: "GOWNER",
          name: "Archive Basics",
          description: "A different searchable description",
          tokenAddr: "TOKEN",
          createdAt: 456,
          visibility: 1,
          status: 1,
          deadline: 0,
          maxEnrollees: 10,
        },
      ],
      questStats: {
        7: {
          enrolleeCount: 4,
          milestoneCount: 0,
          poolBalance: 0,
        },
        8: {
          enrolleeCount: 1,
          milestoneCount: 0,
          poolBalance: 25,
        },
      },
      questMilestones: {},
      questCompletions: {},
    },
    isLoading: false,
    error: null,
    isEmpty: false,
    refetch: async () => {},
  }),
}))

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { useWallet } from "../hooks/use-wallet"
const mockUseWallet = vi.mocked(useWallet)

describe("Dashboard keyboard navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    mockUseWallet.mockReturnValue({
      connected: true,
      connect: vi.fn(),
      shortAddress: "GABC…XYZ",
      address: "GABC1234567890XYZ",
    } as unknown as ReturnType<typeof useWallet>)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("opens a quest card with Enter and Space", async () => {
    const { Dashboard } = await import("./dashboard")
    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      )
    })

    const questTitle = screen.getAllByText(/quest alpha/i)[0]
    const cardButton = questTitle.closest("button")
    await act(async () => {
      fireEvent.click(cardButton!)
    })
    expect(mockNavigate).toHaveBeenCalledWith("/quest/7")
  })

  it("renders quest cards for connected users", async () => {
    const { Dashboard } = await import("./dashboard")
    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      )
    })

    expect(screen.getAllByText(/quest alpha/i).length).toBeGreaterThan(0)
  })
})
