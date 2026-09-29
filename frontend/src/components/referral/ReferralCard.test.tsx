import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ReferralCard } from "./ReferralCard"
import * as referralsLib from "@/lib/referrals"

describe("ReferralCard Component", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it("renders referral card with prompt to connect wallet when disconnected", () => {
    render(<ReferralCard questId={1} questTitle="Intro to Rust" userAddress={null} />)

    expect(screen.getByText("Refer & Earn")).toBeDefined()
    expect(
      screen.getByText(/Connect your wallet to generate your personal referral link/i)
    ).toBeDefined()
  })

  it("renders unique referral link and copy button when wallet is connected", () => {
    render(<ReferralCard questId={1} questTitle="Intro to Rust" userAddress="G_TEST_USER_ADDR" />)

    expect(screen.getByText("Refer & Earn")).toBeDefined()
    const input = screen.getByLabelText("Referral link") as HTMLInputElement
    expect(input.value).toContain("quest/1?ref=G_TEST_USER_ADDR")
    expect(screen.getByLabelText("Copy referral link")).toBeDefined()
  })

  it("displays referral stats and claim button when rewards are claimable", () => {
    vi.spyOn(referralsLib, "getReferralStats").mockReturnValue({
      totalReferrals: 3,
      completedReferrals: 2,
      pendingReferrals: 1,
      totalEarned: 20,
      claimableAmount: 20,
      referralLink: "https://app.lernza.com/quest/1?ref=G_TEST_USER_ADDR",
    })

    const onClaim = vi.fn()

    render(
      <ReferralCard
        questId={1}
        questTitle="Intro to Rust"
        userAddress="G_TEST_USER_ADDR"
        onRewardClaimed={onClaim}
      />
    )

    expect(screen.getByText("3")).toBeDefined() // Total referred
    expect(screen.getByText("2")).toBeDefined() // Completed
    expect(screen.getByText("20 Tokens")).toBeDefined()
    expect(screen.getByRole("button", { name: /Claim Rewards/i })).toBeDefined()
  })
})
