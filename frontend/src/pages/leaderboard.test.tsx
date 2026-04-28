import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

vi.mock("@/hooks/use-async-data", () => ({
  useAsyncData: vi.fn(),
}))

import { useAsyncData } from "@/hooks/use-async-data"
import { Leaderboard } from "./leaderboard"

const mockUseAsyncData = vi.mocked(useAsyncData)

const EARNER_DATA = {
  data: [{ address: "GCLICKEDUSER123456789", totalEarned: 250n, rank: 1 }],
  isLoading: false,
  error: null,
  isEmpty: false,
  refetch: async () => {},
}

const QUEST_DATA = {
  data: [{ id: 42, name: "Quest Alpha", enrolleeCount: 10, rank: 1 }],
  isLoading: false,
  error: null,
  isEmpty: false,
  refetch: async () => {},
}

describe("Leaderboard", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    // The component calls useAsyncData twice per render (once for earners, once for quests).
    // Calls alternate: even indices → earners hook, odd indices → quests hook.
    let callIndex = 0
    mockUseAsyncData.mockImplementation(() => {
      const data = callIndex % 2 === 0 ? EARNER_DATA : QUEST_DATA
      callIndex++
      return data
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("earner row links to the creator profile page", () => {
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    )

    const earnerLink = screen.getByText(/gclick/i).closest("a")
    expect(earnerLink).toHaveAttribute("href", "/creator/GCLICKEDUSER123456789")
  })

  it("quest row links to the quest detail page", async () => {
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /most active quests/i }))

    await act(async () => {
      await Promise.resolve()
    })

    const questLink = screen.getByText("Quest Alpha").closest("a")
    expect(questLink).toHaveAttribute("href", "/quest/42")
  })
})
