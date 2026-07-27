import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"

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
      1: { enrolleeCount: 2, milestoneCount: 0, poolBalance: 10 },
      2: { enrolleeCount: 9, milestoneCount: 0, poolBalance: 100 },
      3: { enrolleeCount: 1, milestoneCount: 0, poolBalance: 1000 },
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
    name: "Rust Basics",
    description: "Learn Rust fundamentals",
    category: "Programming",
    tags: ["rust", "beginner"],
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
    name: "Advanced Soroban",
    description: "Deep dive into Soroban smart contracts",
    category: "Blockchain",
    tags: ["soroban", "advanced"],
    tokenAddr: "TOKEN",
    createdAt: 300,
    visibility: 0,
    status: 0,
    deadline: 0,
    maxEnrollees: 10,
  },
  {
    id: 3,
    owner: "GOWNER",
    name: "Design Fundamentals",
    description: "UI/UX design basics",
    category: "Design",
    tags: ["ui", "ux"],
    tokenAddr: "TOKEN",
    createdAt: 200,
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
      questCompletions: {},
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

// The "Your Quests" grid is the only element with this exact class combo —
// TrendingQuests (right column) and RecentActivity render the same quest
// names elsewhere on the page, so queries must be scoped to this grid to
// avoid ambiguous-match errors.
function getQuestGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector(".relative.grid.gap-5")
  if (!grid) throw new Error("quest grid not found")
  return grid as HTMLElement
}

describe("Dashboard quest search, category filter, and sort", () => {
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

  it("filters quests by search text across name, description, and tags", async () => {
    const { container } = render(<Dashboard />)

    const search = await screen.findByPlaceholderText(/search quests/i)
    fireEvent.change(search, { target: { value: "soroban" } })

    const grid = getQuestGrid(container)
    expect(await within(grid).findByText("Advanced Soroban")).toBeInTheDocument()
    expect(within(grid).queryByText("Rust Basics")).not.toBeInTheDocument()
    expect(within(grid).queryByText("Design Fundamentals")).not.toBeInTheDocument()
  })

  it("clears search text via the clear button", async () => {
    const { container } = render(<Dashboard />)
    const grid = getQuestGrid(container)

    const search = await screen.findByPlaceholderText(/search quests/i)
    fireEvent.change(search, { target: { value: "rust" } })
    expect(await within(grid).findByText("Rust Basics")).toBeInTheDocument()
    expect(within(grid).queryByText("Advanced Soroban")).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/clear search/i))
    expect(await within(grid).findByText("Advanced Soroban")).toBeInTheDocument()
  })

  it("filters quests by category", async () => {
    const { container } = render(<Dashboard />)
    const grid = getQuestGrid(container)

    const categorySelect = await screen.findByLabelText(/filter by category/i)
    fireEvent.change(categorySelect, { target: { value: "Design" } })

    expect(await within(grid).findByText("Design Fundamentals")).toBeInTheDocument()
    expect(within(grid).queryByText("Rust Basics")).not.toBeInTheDocument()
    expect(within(grid).queryByText("Advanced Soroban")).not.toBeInTheDocument()
  })

  it("sorts quests by most enrolled", async () => {
    const { container } = render(<Dashboard />)
    const grid = getQuestGrid(container)

    const sortSelect = await screen.findByLabelText(/sort quests/i)
    fireEvent.change(sortSelect, { target: { value: "most-enrolled" } })

    await within(grid).findByText("Advanced Soroban")
    const titles = within(grid)
      .getAllByRole("button")
      .map(btn => btn.getAttribute("aria-label"))

    expect(titles[0]).toMatch(/Advanced Soroban/)
  })

  it("sorts quests by highest reward", async () => {
    const { container } = render(<Dashboard />)
    const grid = getQuestGrid(container)

    const sortSelect = await screen.findByLabelText(/sort quests/i)
    fireEvent.change(sortSelect, { target: { value: "highest-reward" } })

    await within(grid).findByText("Design Fundamentals")
    const titles = within(grid)
      .getAllByRole("button")
      .map(btn => btn.getAttribute("aria-label"))

    expect(titles[0]).toMatch(/Design Fundamentals/)
  })

  it("shows an empty state when search and category yield no matches", async () => {
    render(<Dashboard />)

    const search = await screen.findByPlaceholderText(/search quests/i)
    fireEvent.change(search, { target: { value: "nonexistent-quest-xyz" } })

    expect(await screen.findByText(/no matching quests/i)).toBeInTheDocument()
  })
})
