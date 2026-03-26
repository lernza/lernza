import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
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
          description: "Desc",
          token_addr: "TOKEN",
          created_at: 123,
          visibility: 0,
        },
      ],
      questStats: {
        7: {
          enrolleeCount: 0,
          milestoneCount: 0,
          poolBalance: 0,
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

    mockUseWallet.mockReturnValue({
      connected: true,
      connect: vi.fn(),
      shortAddress: "GABC…XYZ",
      address: "GABC1234567890XYZ",
    } as unknown as ReturnType<typeof useWallet>)
  })

  it("opens a quest card with Enter and Space", async () => {
    const { Dashboard } = await import("./dashboard")
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    const questTitle = screen.getAllByText(/quest alpha/i)[0]
    const cardButton = questTitle.closest("button")
    fireEvent.click(cardButton!)
    expect(mockNavigate).toHaveBeenCalledWith("/quest/7")
  })
})
