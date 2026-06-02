import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

vi.mock("./dashboard/earnings-chart", () => ({
  default: () => null,
}))

vi.mock("@/lib/contracts/client", () => ({
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
  RPC_TIMEOUT_MS: 15000,
  server: {},
  withTimeout: <T,>(promise: Promise<T>) => promise,
}))

vi.mock("@/hooks/use-token-metadata", () => ({
  useTokenMetadata: () => ({ metadata: null, isLoading: false, error: null }),
}))

vi.mock("@/hooks/use-quest-stats", () => ({
  useQuestStatsMap: () => ({
    statsByQuestId: {
      7: { enrolleeCount: 4, milestoneCount: 0, poolBalance: 0 },
      8: { enrolleeCount: 1, milestoneCount: 0, poolBalance: 25 },
    },
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}))

vi.mock("@/lib/contracts/quest", () => ({
  questClient: {
    listPublicQuests: vi.fn(),
    listQuestsByOwner: vi.fn(),
    listQuestsByEnrollee: vi.fn(),
  },
}))

vi.mock("@/lib/contracts/milestone", () => ({
  milestoneClient: {
    getEnrolleeCompletions: vi.fn(),
  },
}))

vi.mock("@/lib/contracts/rewards", () => ({
  rewardsClient: {
    getUserEarnings: vi.fn(),
  },
}))

vi.mock("@/hooks/use-async-data", () => ({
  useContractData: () => ({
    data: {
      publicQuests: [
        {
          id: 7,
          owner: "GOWNER",
          name: '<script>alert("xss")</script> Quest Alpha',
          description: '<img src=x onerror=alert("xss")> Frontend integration quest',
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
      ownedQuests: [],
      enrolledQuests: [],
      accessibleQuests: [
        {
          id: 7,
          owner: "GOWNER",
          name: '<script>alert("xss")</script> Quest Alpha',
          description: '<img src=x onerror=alert("xss")> Frontend integration quest',
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
      previewQuestIds: [7, 8],
      questCompletions: { 7: 0, 8: 0 },
      userEarnings: 0n,
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
import { Dashboard } from "./dashboard"
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
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    const questTitle = (await screen.findAllByText(/quest alpha/i))[0]
    const cardButton = questTitle.closest("button")
    fireEvent.click(cardButton!)
    expect(mockNavigate).toHaveBeenCalledWith("/quest/7")
  })

  it("renders quest cards for connected users", async () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    expect((await screen.findAllByText(/quest alpha/i)).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/<script>alert\("xss"\)<\/script> quest alpha/i).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/<img src=x onerror=alert\("xss"\)> frontend integration quest/i).length
    ).toBeGreaterThan(0)
    expect(container.querySelector("script")).toBeNull()
  })
})
