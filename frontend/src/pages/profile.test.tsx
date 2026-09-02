import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Profile } from "./profile"

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}))

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: vi.fn(),
}))

vi.mock("@/hooks/use-async-data", () => ({
  useContractData: vi.fn(),
}))

vi.mock("@/hooks/use-profile", () => ({
  useProfile: vi.fn(),
}))

vi.mock("@/hooks/use-onboarding", () => ({
  useOnboarding: vi.fn(() => ({
    open: vi.fn(),
  })),
}))

vi.mock("@/lib/horizon-activity", () => ({
  fetchWalletActivity: vi.fn(),
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

vi.mock("@/lib/reputation", () => ({
  calculateReputation: vi.fn(() => ({
    tier: "Bronze",
    score: 250,
    confidence: 0.8,
  })),
}))

import { useWallet } from "@/hooks/use-wallet"
import { useUserRole } from "@/hooks/use-user-role"
import { useContractData } from "@/hooks/use-async-data"
import { useProfile } from "@/hooks/use-profile"
import { fetchWalletActivity } from "@/lib/horizon-activity"
import { PrivacyLevel as PL, createEmptyProfile } from "@/lib/profile-types"

const mockUseWallet = vi.mocked(useWallet)
const mockUseUserRole = vi.mocked(useUserRole)
const mockUseContractData = vi.mocked(useContractData)
const mockUseProfile = vi.mocked(useProfile)
const mockFetchWalletActivity = vi.mocked(fetchWalletActivity)

function createMockProfileData(address: string) {
  const profile = createEmptyProfile(address)
  profile.metadata.displayName = "Test Learner"
  profile.metadata.bio = "Learning Rust and DeFi"
  return profile
}

function renderProfile() {
  return render(<Profile />)
}

describe("Profile", () => {
  const testAddress = "GABC1234567890XYZ"

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseWallet.mockReturnValue({
      connected: true,
      connect: vi.fn(),
      address: testAddress,
    } as ReturnType<typeof useWallet>)

    mockUseUserRole.mockReturnValue({
      role: "learner",
      isOwner: false,
      isEnrolled: true,
      ownedQuests: [],
      enrolledQuests: [],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useUserRole>)

    const mockProfile = createMockProfileData(testAddress)
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      viewerIsOwner: true,
      hasContent: true,
      filteredMetadata: {
        displayName: mockProfile.metadata.displayName,
        bio: mockProfile.metadata.bio,
        tags: mockProfile.metadata.tags,
        links: mockProfile.metadata.links,
      },
      filteredShowcasedQuests: [],
      filteredShowcasedRewards: [],
      setMetadata: vi.fn(),
      setFieldPrivacy: vi.fn(),
      setShowcaseSettings: vi.fn(),
      addOrUpdateShowcasedQuest: vi.fn(),
      deleteShowcasedQuest: vi.fn(),
      setQuestPrivacy: vi.fn(),
      toggleQuestHighlighted: vi.fn(),
      addOrUpdateShowcasedReward: vi.fn(),
      deleteShowcasedReward: vi.fn(),
      setRewardPrivacy: vi.fn(),
      refreshProfile: vi.fn(),
      validateCurrent: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
    })

    mockUseContractData.mockImplementation(key => {
      if (key === "rewards") {
        return {
          data: 7_500_000_000n,
          isLoading: false,
          error: null,
        }
      }

      return {
        data: {
          totalQuests: 0,
          totalEnrollees: 0,
          totalPoolBalance: 0n,
          quests: [],
        },
        isLoading: false,
        error: null,
      }
    })
  })

  it("shows overview stats including completed quests count and reputation tier", () => {
    renderProfile()

    expect(screen.getByText("Profile Overview")).toBeTruthy()
    expect(screen.getByText("Completed Quests")).toBeTruthy()
    expect(screen.getByText("Rewards Showcased")).toBeTruthy()
    expect(screen.getByText("Reputation Tier")).toBeTruthy()
  })

  it("shows the aggregate on-chain earnings card", () => {
    renderProfile()

    expect(screen.getByText("On-chain earnings total")).toBeTruthy()
    expect(screen.getByText("+750 USDC")).toBeTruthy()
  })

  it("renders profile tab navigation", () => {
    renderProfile()

    expect(screen.getByRole("button", { name: "Overview" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Achievements" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Activity" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /settings/i })).toBeTruthy()
  })

  it("loads and renders wallet activity from Horizon when Activity tab is clicked", async () => {
    mockFetchWalletActivity.mockResolvedValue({
      items: [
        {
          id: "op-1",
          type: "rewarded",
          questId: 12,
          questName: "Rust Basics",
          timestamp: Date.parse("2026-03-20T12:00:00Z"),
          txHash: "abc123",
          href: "https://stellar.expert/explorer/testnet/tx/abc123",
          amount: 2_500_000_000n,
        },
      ],
      nextCursor: null,
      capReached: false,
    })

    renderProfile()
    fireEvent.click(screen.getByRole("button", { name: "Activity" }))

    await waitFor(() => {
      expect(mockFetchWalletActivity).toHaveBeenCalledWith(
        testAddress,
        null,
        0,
        expect.any(AbortSignal)
      )
    })

    expect(screen.getByText("Wallet timeline")).toBeTruthy()
    expect(screen.getAllByText("Rewarded").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Rust Basics").length).toBeGreaterThan(0)
    expect(screen.getAllByText("+250 USDC").length).toBeGreaterThan(0)
    const allLinks = screen.getAllByRole("link", { name: /view transaction/i })
    expect(allLinks[0].getAttribute("href")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123"
    )
  })

  it("shows empty onboarding state when profile has no content", () => {
    mockUseProfile.mockReturnValue({
      profile: createEmptyProfile(testAddress),
      isLoading: false,
      error: null,
      viewerIsOwner: true,
      hasContent: false,
      filteredMetadata: {},
      filteredShowcasedQuests: [],
      filteredShowcasedRewards: [],
      setMetadata: vi.fn(),
      setFieldPrivacy: vi.fn(),
      setShowcaseSettings: vi.fn(),
      addOrUpdateShowcasedQuest: vi.fn(),
      deleteShowcasedQuest: vi.fn(),
      setQuestPrivacy: vi.fn(),
      toggleQuestHighlighted: vi.fn(),
      addOrUpdateShowcasedReward: vi.fn(),
      deleteShowcasedReward: vi.fn(),
      setRewardPrivacy: vi.fn(),
      refreshProfile: vi.fn(),
      validateCurrent: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
    })

    renderProfile()

    expect(screen.getByText(/Welcome to Lernza/i)).toBeTruthy()
    expect(screen.getByText("Customize Your Profile")).toBeTruthy()
    expect(screen.getByText("Complete your profile setup")).toBeTruthy()
  })

  it("displays user's display name in profile header when set", () => {
    renderProfile()
    expect(screen.getByText("Test Learner")).toBeTruthy()
  })

  it("shows Achievements tab with quests and rewards showcase", () => {
    mockUseProfile.mockReturnValue({
      ...mockUseProfile(),
      filteredShowcasedQuests: [
        {
          questId: 1,
          questName: "DeFi Fundamentals",
          description: "Learn about AMMs and liquidity pools",
          completionDate: Date.now(),
          milestoneCount: 5,
          completedMilestones: 5,
          totalRewardsEarned: 100_000_000n,
          highlighted: true,
          privacy: PL.Public,
        },
      ],
      filteredShowcasedRewards: [
        {
          id: "r1",
          questId: 1,
          questName: "DeFi Fundamentals",
          milestoneId: 3,
          milestoneTitle: "Liquidity Pools",
          amount: 50_000_000n,
          earnedAt: Date.now(),
          privacy: PL.Public,
        },
      ],
    } as ReturnType<typeof useProfile>)

    renderProfile()
    fireEvent.click(screen.getByRole("button", { name: "Achievements" }))

    expect(screen.getByText("Completed Quests")).toBeTruthy()
    expect(screen.getByText("Rewards Earned")).toBeTruthy()
    expect(screen.getAllByText("DeFi Fundamentals").length).toBeGreaterThan(0)
    expect(screen.getByText("Liquidity Pools")).toBeTruthy()
  })
})
