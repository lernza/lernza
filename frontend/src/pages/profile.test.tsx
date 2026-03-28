import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
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

vi.mock("@/lib/horizon-activity", () => ({
  fetchWalletActivity: vi.fn(),
}))

import { useWallet } from "@/hooks/use-wallet"
import { useUserRole } from "@/hooks/use-user-role"
import { useContractData } from "@/hooks/use-async-data"
import { fetchWalletActivity } from "@/lib/horizon-activity"

const mockUseWallet = vi.mocked(useWallet)
const mockUseUserRole = vi.mocked(useUserRole)
const mockUseContractData = vi.mocked(useContractData)
const mockFetchWalletActivity = vi.mocked(fetchWalletActivity)

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  )
}

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseWallet.mockReturnValue({
      connected: true,
      connect: vi.fn(),
      address: "GABC1234567890XYZ",
    } as ReturnType<typeof useWallet>)

    mockUseUserRole.mockReturnValue({
      role: "learner",
      isLoading: false,
    } as ReturnType<typeof useUserRole>)

    mockUseContractData.mockImplementation(key => {
      if (key === "rewards") {
        return {
          data: 750n,
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

  it("shows the aggregate on-chain earnings in the overview tab", () => {
    renderProfile()

    expect(screen.getByText("Profile Activity")).toBeTruthy()
    expect(screen.getByText("750 USDC")).toBeTruthy()
    expect(screen.getByText("USDC earned on-chain")).toBeTruthy()
    expect(screen.getByText(/use the activity tab to inspect recent enrollments/i)).toBeTruthy()
  })

  it("loads and renders wallet activity from Horizon", async () => {
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
          amount: 250n,
        },
      ],
      nextCursor: null,
    })

    renderProfile()
    fireEvent.click(screen.getByRole("button", { name: "activity" }))

    await waitFor(() => {
      expect(mockFetchWalletActivity).toHaveBeenCalledWith("GABC1234567890XYZ")
    })

    expect(screen.getByText("Wallet timeline")).toBeTruthy()
    expect(screen.getByText("Rewarded")).toBeTruthy()
    expect(screen.getByText("Rust Basics")).toBeTruthy()
    expect(screen.getByText("+250 USDC")).toBeTruthy()
    expect(screen.getByRole("link", { name: /view transaction/i }).getAttribute("href")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123"
    )
  })
})
