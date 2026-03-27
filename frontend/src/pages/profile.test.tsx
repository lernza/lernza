import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { Profile } from "./profile"

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}))

vi.mock("@/lib/contracts/rewards", () => ({
  rewardsClient: {
    getUserEarnings: vi.fn(),
  },
}))

import { useWallet } from "@/hooks/use-wallet"
import { rewardsClient } from "@/lib/contracts/rewards"

const mockUseWallet = vi.mocked(useWallet)
const mockGetUserEarnings = vi.mocked(rewardsClient.getUserEarnings)

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the aggregate earnings total from the rewards contract and shows a history placeholder", async () => {
    mockUseWallet.mockReturnValue({
      connected: true,
      connect: vi.fn(),
      address: "GABC1234567890XYZ",
    } as ReturnType<typeof useWallet>)
    mockGetUserEarnings.mockResolvedValue(750n)

    render(<Profile />)

    await waitFor(() => {
      expect(mockGetUserEarnings).toHaveBeenCalledWith("GABC1234567890XYZ")
    })

    expect(screen.getByText("750 TOKEN")).toBeTruthy()
    expect(screen.getByText("USDC earned on-chain")).toBeTruthy()
    expect(screen.getByText("Aggregate total only")).toBeTruthy()
    expect(
      screen.getByText(
        /per-milestone payout history is not indexable from the current on-chain api yet/i
      )
    ).toBeTruthy()
  })
})
