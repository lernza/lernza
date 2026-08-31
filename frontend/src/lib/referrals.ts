/**
 * Referral system management utilities
 */

export interface ReferralConfig {
  enabled: boolean
  bonusAmount: number // Amount in whole tokens awarded per successful referral
  rewardTrigger: "enroll" | "milestone_1" | "complete"
  maxReferralsPerUser?: number
}

export interface ReferralRecord {
  questId: number
  referrer: string
  referee: string
  status: "pending" | "completed" | "claimed"
  rewardAmount: number
  createdAt: number
  completedAt?: number
}

export interface ReferralStats {
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  totalEarned: number
  claimableAmount: number
  referralLink: string
}

const STORAGE_PREFIX = "lernza_referral_"
const CONFIG_PREFIX = "lernza_ref_config_"

/**
 * Generate a personalized referral link for a quest
 */
export function getReferralLink(
  questId: number,
  referrerAddress: string,
  baseUrl?: string
): string {
  const origin =
    baseUrl || (typeof window !== "undefined" ? window.location.origin : "https://app.lernza.com")
  return `${origin}/quest/${questId}?ref=${encodeURIComponent(referrerAddress)}`
}

/**
 * Store a referral attribution from a URL parameter
 */
export function storePendingReferral(questId: number, referrer: string): void {
  if (typeof window === "undefined" || !referrer) return
  try {
    const key = `${STORAGE_PREFIX}pending_${questId}`
    sessionStorage.setItem(key, referrer)
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Retrieve a pending referrer for a quest
 */
export function getPendingReferrer(questId: number): string | null {
  if (typeof window === "undefined") return null
  try {
    const key = `${STORAGE_PREFIX}pending_${questId}`
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Clear pending referrer after enrollment
 */
export function clearPendingReferral(questId: number): void {
  if (typeof window === "undefined") return
  try {
    const key = `${STORAGE_PREFIX}pending_${questId}`
    sessionStorage.removeItem(key)
  } catch {
    // ignore storage errors
  }
}

/**
 * Get configured referral settings for a quest
 */
export function getQuestReferralConfig(questId: number): ReferralConfig {
  const defaultConfig: ReferralConfig = {
    enabled: true,
    bonusAmount: 10,
    rewardTrigger: "complete",
    maxReferralsPerUser: 50,
  }

  if (typeof window === "undefined") return defaultConfig

  try {
    const raw = localStorage.getItem(`${CONFIG_PREFIX}${questId}`)
    if (raw) {
      return { ...defaultConfig, ...JSON.parse(raw) }
    }
  } catch {
    // ignore storage errors
  }

  return defaultConfig
}

/**
 * Save referral settings for a quest
 */
export function setQuestReferralConfig(questId: number, config: Partial<ReferralConfig>): void {
  if (typeof window === "undefined") return
  try {
    const current = getQuestReferralConfig(questId)
    const updated = { ...current, ...config }
    localStorage.setItem(`${CONFIG_PREFIX}${questId}`, JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
}

/**
 * Record a referral when a user enrolls
 */
export function recordReferralEnrollment(questId: number, referee: string): ReferralRecord | null {
  const referrer = getPendingReferrer(questId)
  if (!referrer || referrer.toLowerCase() === referee.toLowerCase()) {
    clearPendingReferral(questId)
    return null
  }

  const config = getQuestReferralConfig(questId)
  if (!config.enabled) {
    clearPendingReferral(questId)
    return null
  }

  const record: ReferralRecord = {
    questId,
    referrer,
    referee,
    status: config.rewardTrigger === "enroll" ? "completed" : "pending",
    rewardAmount: config.bonusAmount,
    createdAt: Date.now(),
    completedAt: config.rewardTrigger === "enroll" ? Date.now() : undefined,
  }

  try {
    const key = `${STORAGE_PREFIX}records_${questId}`
    const existing: ReferralRecord[] = JSON.parse(localStorage.getItem(key) || "[]")
    // Prevent duplicate referral for same referee on same quest
    if (!existing.some(r => r.referee.toLowerCase() === referee.toLowerCase())) {
      existing.push(record)
      localStorage.setItem(key, JSON.stringify(existing))
    }
  } catch {
    // ignore storage errors
  }

  clearPendingReferral(questId)
  return record
}

/**
 * Complete referral when referee finishes milestone/quest
 */
export function markReferralCompleted(questId: number, referee: string): void {
  if (typeof window === "undefined") return
  try {
    const key = `${STORAGE_PREFIX}records_${questId}`
    const existing: ReferralRecord[] = JSON.parse(localStorage.getItem(key) || "[]")
    let modified = false

    const updated = existing.map(r => {
      if (r.referee.toLowerCase() === referee.toLowerCase() && r.status === "pending") {
        modified = true
        return { ...r, status: "completed" as const, completedAt: Date.now() }
      }
      return r
    })

    if (modified) {
      localStorage.setItem(key, JSON.stringify(updated))
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Get referral stats for a specific user and quest
 */
export function getReferralStats(questId: number, walletAddress: string): ReferralStats {
  const referralLink = getReferralLink(questId, walletAddress)

  if (typeof window === "undefined" || !walletAddress) {
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalEarned: 0,
      claimableAmount: 0,
      referralLink,
    }
  }

  try {
    const key = `${STORAGE_PREFIX}records_${questId}`
    const records: ReferralRecord[] = JSON.parse(localStorage.getItem(key) || "[]")
    const userRecords = records.filter(
      r => r.referrer.toLowerCase() === walletAddress.toLowerCase()
    )

    const completed = userRecords.filter(r => r.status === "completed" || r.status === "claimed")
    const pending = userRecords.filter(r => r.status === "pending")
    const claimable = userRecords.filter(r => r.status === "completed")

    const totalEarned = completed.reduce((sum, r) => sum + r.rewardAmount, 0)
    const claimableAmount = claimable.reduce((sum, r) => sum + r.rewardAmount, 0)

    return {
      totalReferrals: userRecords.length,
      completedReferrals: completed.length,
      pendingReferrals: pending.length,
      totalEarned,
      claimableAmount,
      referralLink,
    }
  } catch {
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalEarned: 0,
      claimableAmount: 0,
      referralLink,
    }
  }
}

/**
 * Claim earned referral rewards
 */
export function claimReferralRewards(questId: number, walletAddress: string): number {
  if (typeof window === "undefined" || !walletAddress) return 0
  try {
    const key = `${STORAGE_PREFIX}records_${questId}`
    const records: ReferralRecord[] = JSON.parse(localStorage.getItem(key) || "[]")
    let claimedTotal = 0

    const updated = records.map(r => {
      if (r.referrer.toLowerCase() === walletAddress.toLowerCase() && r.status === "completed") {
        claimedTotal += r.rewardAmount
        return { ...r, status: "claimed" as const }
      }
      return r
    })

    if (claimedTotal > 0) {
      localStorage.setItem(key, JSON.stringify(updated))
    }
    return claimedTotal
  } catch {
    return 0
  }
}

/**
 * Get all referral metrics for a quest (creator analytics)
 */
export function getQuestReferralOverview(questId: number) {
  const config = getQuestReferralConfig(questId)
  if (typeof window === "undefined") {
    return {
      config,
      totalReferrals: 0,
      completedReferrals: 0,
      totalRewardsDistributed: 0,
      topReferrers: [],
    }
  }

  try {
    const key = `${STORAGE_PREFIX}records_${questId}`
    const records: ReferralRecord[] = JSON.parse(localStorage.getItem(key) || "[]")

    const referrerMap = new Map<string, { count: number; completed: number; earned: number }>()

    for (const r of records) {
      const entry = referrerMap.get(r.referrer) || { count: 0, completed: 0, earned: 0 }
      entry.count += 1
      if (r.status === "completed" || r.status === "claimed") {
        entry.completed += 1
        entry.earned += r.rewardAmount
      }
      referrerMap.set(r.referrer, entry)
    }

    const topReferrers = Array.from(referrerMap.entries())
      .map(([address, stats]) => ({
        address,
        ...stats,
      }))
      .sort((a, b) => b.completed - a.completed)

    const completedReferrals = records.filter(
      r => r.status === "completed" || r.status === "claimed"
    ).length
    const totalRewardsDistributed = records
      .filter(r => r.status === "claimed")
      .reduce((sum, r) => sum + r.rewardAmount, 0)

    return {
      config,
      totalReferrals: records.length,
      completedReferrals,
      totalRewardsDistributed,
      topReferrers,
    }
  } catch {
    return {
      config,
      totalReferrals: 0,
      completedReferrals: 0,
      totalRewardsDistributed: 0,
      topReferrers: [],
    }
  }
}
