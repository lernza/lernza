import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"

vi.mock("@/hooks/use-async-data", () => ({
  useAsyncData: vi.fn(),
}))

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}))

vi.mock("@/lib/contracts/client", () => ({
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
  RPC_TIMEOUT_MS: 15000,
  server: {
    simulateTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getAccount: vi.fn(),
  },
  withTimeout: <T,>(promise: Promise<T>) => promise,
}))

vi.mock("@/lib/contracts/quest", () => ({
  questClient: {
    listPublicQuests: vi.fn(),
    getEnrollees: vi.fn(),
  },
}))

vi.mock("@/lib/contracts/rewards", () => ({
  rewardsClient: {
    getUserEarnings: vi.fn(),
  },
}))

import { useAsyncData } from "@/hooks/use-async-data"
import { useWallet } from "@/hooks/use-wallet"
import { questClient } from "@/lib/contracts/quest"
import { rewardsClient } from "@/lib/contracts/rewards"

const mockUseWallet = vi.mocked(useWallet)
const mockQuestClient = vi.mocked(questClient, true)
const mockRewardsClient = vi.mocked(rewardsClient, true)
import { Leaderboard, fetchTopEarners, fetchMostActiveQuests } from "./leaderboard"

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

    mockUseWallet.mockReturnValue({
      connected: true,
      connect: vi.fn(),
      address: "GABC1234567890XYZ",
    } as ReturnType<typeof useWallet>)

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
    render(<Leaderboard />)

    const earnerLink = screen.getByText(/gclick/i).closest("a")
    expect(earnerLink).toHaveAttribute("href", "/creator/GCLICKEDUSER123456789")
  })

  it("quest row links to the quest detail page", async () => {
    render(<Leaderboard />)

    fireEvent.click(screen.getByRole("tab", { name: /view active quests/i }))

    await act(async () => {
      await Promise.resolve()
    })

    const questLink = screen.getByText("Quest Alpha").closest("a")
    expect(questLink).toHaveAttribute("href", "/quest/42")
  })
})

describe("fetchTopEarners tie-breaking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("orders tied earners deterministically by address, regardless of enrollee order", async () => {
    mockQuestClient.listPublicQuests.mockResolvedValue([
      { id: 1, name: "Quest One" } as unknown as Awaited<
        ReturnType<typeof questClient.listPublicQuests>
      >[number],
    ])
    // Enrollee order is not sorted by address on purpose, to prove the
    // ranking doesn't just fall out of Set insertion order.
    mockQuestClient.getEnrollees.mockResolvedValue(["GBBB", "GAAA", "GCCC"])
    // All three have identical earnings, so this is a full tie.
    mockRewardsClient.getUserEarnings.mockResolvedValue(100n)

    const runs = await Promise.all([fetchTopEarners(), fetchTopEarners(), fetchTopEarners()])

    const addressOrder = runs.map(run => run.map(e => e.address))
    // Every run should produce the exact same order.
    expect(addressOrder[1]).toEqual(addressOrder[0])
    expect(addressOrder[2]).toEqual(addressOrder[0])
    // And that order should be ascending by address, not insertion order.
    expect(addressOrder[0]).toEqual(["GAAA", "GBBB", "GCCC"])
  })
})

describe("fetchMostActiveQuests tie-breaking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("orders quests with equal enrollee counts deterministically by id", async () => {
    mockQuestClient.listPublicQuests.mockResolvedValue([
      { id: 30, name: "Quest C" },
      { id: 10, name: "Quest A" },
      { id: 20, name: "Quest B" },
    ] as unknown as Awaited<ReturnType<typeof questClient.listPublicQuests>>)
    mockQuestClient.getEnrollees.mockResolvedValue(["G1", "G2"]) // same count for all quests

    const runs = await Promise.all([
      fetchMostActiveQuests(),
      fetchMostActiveQuests(),
      fetchMostActiveQuests(),
    ])

    const idOrder = runs.map(run => run.map(q => q.id))
    expect(idOrder[1]).toEqual(idOrder[0])
    expect(idOrder[2]).toEqual(idOrder[0])
    expect(idOrder[0]).toEqual([10, 20, 30])
  })
})
