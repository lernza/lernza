import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, within } from "@testing-library/react"

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
      1: { enrolleeCount: 2, milestoneCount: 4, poolBalance: 100 },
      2: { enrolleeCount: 1, milestoneCount: 3, poolBalance: 50 },
      3: { enrolleeCount: 1, milestoneCount: 2, poolBalance: 25 },
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

const QUESTS = [
  {
    id: 1,
    owner: "GOWNER",
    name: "Not Started Quest",
    description: "Zero completions",
    category: "Programming",
    tags: ["rust"],
    tokenAddr: "TOKEN",
    createdAt: 100,
    visibility: 0,
    status: 0,
    deadline: 0,
    maxEnrollees: 10,
  },
  {
    id: 2,
    owner: "GOWNER",
    name: "In Progress Quest",
    description: "Some completions",
    category: "Blockchain",
    tags: ["soroban"],
    tokenAddr: "TOKEN",
    createdAt: 200,
    visibility: 0,
    status: 0,
    deadline: 0,
    maxEnrollees: 10,
  },
  {
    id: 3,
    owner: "GOWNER",
    name: "Unknown Progress Quest",
    description: "Missing completion data",
    category: "Design",
    tags: ["ui"],
    tokenAddr: "TOKEN",
    createdAt: 300,
    visibility: 0,
    status: 0,
    deadline: 0,
    maxEnrollees: 10,
  },
]

vi.mock("@/hooks/use-async-data", () => ({
  useContractData: () => ({
    data: {
      publicQuests: QUESTS,
      ownedQuests: [],
      enrolledQuests: [],
      accessibleQuests: QUESTS,
      previewQuestIds: QUESTS.map(q => q.id),
      // Quest 1: explicit 0 (not started). Quest 2: in progress. Quest 3: absent/null.
      questCompletions: { 1: 0, 2: 2 },
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

import { useWallet } from "@/hooks/use-wallet"
import { Dashboard } from "./dashboard"
const mockUseWallet = vi.mocked(useWallet)

function getQuestGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector(".relative.grid.gap-5")
  if (!grid) throw new Error("quest grid not found")
  return grid as HTMLElement
}

function questCard(grid: HTMLElement, name: string): HTMLElement {
  const title = within(grid).getByText(name)
  const card = title.closest("button")
  if (!card) throw new Error(`card for ${name} not found`)
  return card
}

describe("Dashboard quest card completion progress (#1331)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, "", "/dashboard")

    mockUseWallet.mockReturnValue({
      connected: true,
      connect: vi.fn(),
      shortAddress: "GABC…XYZ",
      address: "GABC1234567890XYZ",
    } as unknown as ReturnType<typeof useWallet>)
  })

  it("shows Not started instead of a 0% progress bar when completion is 0", async () => {
    const { container } = render(<Dashboard />)
    const grid = getQuestGrid(container)
    await within(grid).findByText("Not Started Quest")
    const card = questCard(grid, "Not Started Quest")

    expect(within(card).getByTestId("quest-progress-not-started")).toHaveTextContent("Not started")
    expect(within(card).queryByRole("progressbar")).not.toBeInTheDocument()
    expect(within(card).queryByText("0/4")).not.toBeInTheDocument()
  })

  it("shows Not started when completion_percentage is missing/null", async () => {
    const { container } = render(<Dashboard />)
    const grid = getQuestGrid(container)
    await within(grid).findByText("Unknown Progress Quest")
    const card = questCard(grid, "Unknown Progress Quest")

    expect(within(card).getByTestId("quest-progress-not-started")).toHaveTextContent("Not started")
    expect(within(card).queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it("still shows a progress bar when the user has completed milestones", async () => {
    const { container } = render(<Dashboard />)
    const grid = getQuestGrid(container)
    await within(grid).findByText("In Progress Quest")
    const card = questCard(grid, "In Progress Quest")

    expect(within(card).queryByTestId("quest-progress-not-started")).not.toBeInTheDocument()
    expect(within(card).getByRole("progressbar")).toBeInTheDocument()
    expect(within(card).getByText("2/3")).toBeInTheDocument()
  })
})
