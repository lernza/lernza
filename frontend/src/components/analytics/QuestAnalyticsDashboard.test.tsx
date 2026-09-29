import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QuestAnalyticsDashboard } from "./QuestAnalyticsDashboard"
import * as referralsLib from "@/lib/referrals"

describe("QuestAnalyticsDashboard Component", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it("renders dashboard header, KPI stats, and completion rate", () => {
    render(
      <QuestAnalyticsDashboard
        questId={12}
        questTitle="Building on Soroban"
        totalEnrollees={50}
        completedLearners={25}
        inProgressLearners={20}
        stalledLearners={5}
        totalDistributedTokens={1000}
        poolRemaining={4000}
      />
    )

    expect(screen.getByText("Quest Analytics Dashboard")).toBeDefined()
    expect(screen.getByText("Quest #12")).toBeDefined()
    expect(screen.getByText("50")).toBeDefined() // Total enrolled
    expect(screen.getByText("50%")).toBeDefined() // Completion rate
    expect(screen.getAllByText("20").length).toBeGreaterThan(0) // In progress
  })

  it("renders milestone engagement breakdown table with dropoff rates", () => {
    const milestoneStats = [
      {
        milestoneId: 1,
        title: "Setup Environment",
        rewardAmount: 100,
        completedCount: 45,
        inProgressCount: 5,
        dropoffRate: 10,
        avgTimeToCompleteHours: 2,
      },
      {
        milestoneId: 2,
        title: "Deploy Contract",
        rewardAmount: 200,
        completedCount: 25,
        inProgressCount: 15,
        dropoffRate: 44,
        avgTimeToCompleteHours: 8,
      },
    ]

    render(
      <QuestAnalyticsDashboard
        questId={12}
        questTitle="Building on Soroban"
        totalEnrollees={50}
        completedLearners={25}
        inProgressLearners={20}
        stalledLearners={5}
        milestoneStats={milestoneStats}
      />
    )

    expect(screen.getByText("Setup Environment")).toBeDefined()
    expect(screen.getByText("Deploy Contract")).toBeDefined()
    expect(screen.getByText("100 Tokens")).toBeDefined()
    expect(screen.getByText("200 Tokens")).toBeDefined()
    expect(screen.getByText("10%")).toBeDefined()
    expect(screen.getByText("44%")).toBeDefined()
  })

  it("renders referral impact section with top referrers", () => {
    vi.spyOn(referralsLib, "getQuestReferralOverview").mockReturnValue({
      config: { enabled: true, bonusAmount: 15, rewardTrigger: "complete" },
      totalReferrals: 8,
      completedReferrals: 6,
      totalRewardsDistributed: 90,
      topReferrers: [
        { address: "G_AMBASSADOR_1", count: 5, completed: 4, earned: 60 },
        { address: "G_AMBASSADOR_2", count: 3, completed: 2, earned: 30 },
      ],
    })

    render(
      <QuestAnalyticsDashboard
        questId={12}
        questTitle="Building on Soroban"
        totalEnrollees={50}
        completedLearners={25}
        inProgressLearners={20}
        stalledLearners={5}
      />
    )

    expect(screen.getByText("Referral Program Impact")).toBeDefined()
    expect(screen.getByText("G_AMBASSADOR_1")).toBeDefined()
    expect(screen.getAllByText("60 Tokens").length).toBeGreaterThan(0)
    expect(screen.getByText("G_AMBASSADOR_2")).toBeDefined()
  })
})
