import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  getReferralLink,
  storePendingReferral,
  getPendingReferrer,
  clearPendingReferral,
  getQuestReferralConfig,
  setQuestReferralConfig,
  recordReferralEnrollment,
  markReferralCompleted,
  getReferralStats,
  claimReferralRewards,
  getQuestReferralOverview,
} from "./referrals"

describe("Referral System Utilities", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it("generates correct referral link with URL encoding", () => {
    const link = getReferralLink(42, "GBZX...1234", "https://app.lernza.com")
    expect(link).toBe("https://app.lernza.com/quest/42?ref=GBZX...1234")
  })

  it("stores, retrieves, and clears pending referral attribution in session storage", () => {
    storePendingReferral(10, "G_REFERRER_ADDR")
    expect(getPendingReferrer(10)).toBe("G_REFERRER_ADDR")

    clearPendingReferral(10)
    expect(getPendingReferrer(10)).toBeNull()
  })

  it("gets default and custom quest referral config", () => {
    const defaultConfig = getQuestReferralConfig(99)
    expect(defaultConfig.enabled).toBe(true)
    expect(defaultConfig.bonusAmount).toBe(10)

    setQuestReferralConfig(99, { bonusAmount: 25, rewardTrigger: "enroll" })
    const updatedConfig = getQuestReferralConfig(99)
    expect(updatedConfig.bonusAmount).toBe(25)
    expect(updatedConfig.rewardTrigger).toBe("enroll")
  })

  it("records referral enrollment and prevents self-referrals", () => {
    // Attempt self-referral
    storePendingReferral(1, "G_USER_A")
    const selfRecord = recordReferralEnrollment(1, "G_USER_A")
    expect(selfRecord).toBeNull()

    // Valid referral
    storePendingReferral(1, "G_USER_A")
    const validRecord = recordReferralEnrollment(1, "G_USER_B")
    expect(validRecord).not.toBeNull()
    expect(validRecord?.referrer).toBe("G_USER_A")
    expect(validRecord?.referee).toBe("G_USER_B")
    expect(validRecord?.status).toBe("pending")
  })

  it("tracks completion, calculates claimable amounts, and processes claims", () => {
    storePendingReferral(1, "G_USER_A")
    recordReferralEnrollment(1, "G_USER_B")

    // Initially pending
    let stats = getReferralStats(1, "G_USER_A")
    expect(stats.totalReferrals).toBe(1)
    expect(stats.pendingReferrals).toBe(1)
    expect(stats.completedReferrals).toBe(0)
    expect(stats.claimableAmount).toBe(0)

    // Mark completed
    markReferralCompleted(1, "G_USER_B")
    stats = getReferralStats(1, "G_USER_A")
    expect(stats.completedReferrals).toBe(1)
    expect(stats.claimableAmount).toBe(10)
    expect(stats.totalEarned).toBe(10)

    // Claim rewards
    const claimed = claimReferralRewards(1, "G_USER_A")
    expect(claimed).toBe(10)

    stats = getReferralStats(1, "G_USER_A")
    expect(stats.claimableAmount).toBe(0)
    expect(stats.totalEarned).toBe(10)
  })

  it("provides comprehensive creator overview with top referrers", () => {
    storePendingReferral(5, "G_TOP_REFERRER")
    recordReferralEnrollment(5, "G_REFEREE_1")
    markReferralCompleted(5, "G_REFEREE_1")

    storePendingReferral(5, "G_TOP_REFERRER")
    recordReferralEnrollment(5, "G_REFEREE_2")
    markReferralCompleted(5, "G_REFEREE_2")

    const overview = getQuestReferralOverview(5)
    expect(overview.totalReferrals).toBe(2)
    expect(overview.completedReferrals).toBe(2)
    expect(overview.topReferrers.length).toBe(1)
    expect(overview.topReferrers[0].address).toBe("G_TOP_REFERRER")
    expect(overview.topReferrers[0].completed).toBe(2)
  })
})
