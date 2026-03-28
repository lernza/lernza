import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

const mockNavigate = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/hooks/use-async-data", () => ({
  useAsyncData: vi.fn(),
}))

import { useAsyncData } from "@/hooks/use-async-data"
import { Leaderboard } from "./leaderboard"

const mockUseAsyncData = vi.mocked(useAsyncData)

describe("Leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAsyncData.mockImplementation(() => {
      if (mockUseAsyncData.mock.calls.length === 1) {
        return {
          data: [
            {
              address: "GCLICKEDUSER123456789",
              totalEarned: 250n,
              rank: 1,
            },
          ],
          isLoading: false,
          error: null,
          isEmpty: false,
          refetch: async () => {},
        }
      }

      return {
        data: [
          {
            id: 42,
            name: "Quest Alpha",
            enrolleeCount: 10,
            rank: 1,
          },
        ],
        isLoading: false,
        error: null,
        isEmpty: false,
        refetch: async () => {},
      }
    })
  })

  it("does not navigate when an earner row is clicked", () => {
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/gclick/i))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("still navigates to quest pages from the quests tab", () => {
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /most active quests/i }))
    fireEvent.click(screen.getByText("Quest Alpha"))

    expect(mockNavigate).toHaveBeenCalledWith("/quest/42")
  })
})
