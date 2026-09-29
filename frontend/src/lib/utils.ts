import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatTokenAmount } from "./token-amount"
import { QuestStatus } from "./contract-types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatTokens(amount: number | bigint, decimals = 7, symbol = "TOKEN"): string {
  if (typeof amount !== "bigint") {
    return formatTokenAmount(amount, { decimals, symbol, compact: true })
  }

  if (amount < 0n) return `ERROR: Negative ${symbol}`
  const whole = amount / 10n ** BigInt(decimals)
  const compactUnits = [
    { divisor: 1_000_000_000n, suffix: "B" },
    { divisor: 1_000_000n, suffix: "M" },
    { divisor: 1_000n, suffix: "K" },
  ]
  for (const { divisor, suffix } of compactUnits) {
    if (whole >= divisor) {
      const tenths = (whole * 10n + divisor / 2n) / divisor
      return `${tenths / 10n}.${tenths % 10n}${suffix} ${symbol}`.trim()
    }
  }
  return formatTokenAmount(amount, { decimals, symbol })
}

/**
 * Formats an amount already denominated in whole USDC tokens.
 *
 * `formatTokens` scales raw amounts by token decimals, so it renders a 100 USDC
 * reward as "0 USDC" — the create-quest form and CSV imports collect whole
 * tokens, not base units.
 */
export function formatUsdc(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function getSecondsRemaining(deadline: number, nowMs = Date.now()): number {
  const nowSeconds = Math.floor(nowMs / 1000) // Convert once to whole seconds
  return Math.max(0, deadline - nowSeconds)
}

export function isExpiredDeadline(deadline: number, nowMs = Date.now()): boolean {
  const nowSeconds = Math.floor(nowMs / 1000)
  return deadline > 0 && deadline <= nowSeconds
}

export function isExpiringSoon(deadline: number, nowMs = Date.now()): boolean {
  if (deadline <= 0) return false
  const remaining = getSecondsRemaining(deadline, nowMs)
  return remaining > 0 && remaining <= 24 * 60 * 60
}

export function formatDeadlineDate(deadline: number): string {
  return new Date(deadline * 1000).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatDeadlineLabel(deadline: number, nowMs = Date.now()): string {
  if (deadline <= 0) return "No deadline"
  if (isExpiredDeadline(deadline, nowMs)) return "Expired"

  const remaining = getSecondsRemaining(deadline, nowMs)
  const days = Math.ceil(remaining / (24 * 60 * 60))
  if (remaining <= 24 * 60 * 60) {
    const hours = Math.max(1, Math.ceil(remaining / (60 * 60)))
    return `Expires in ${hours}h`
  }
  return `Expires in ${days} day${days === 1 ? "" : "s"}`
}

export type QuestLifecycleStatus = "active" | "ended" | "archived" | "cancelled" | "suspended"

/**
 * Single source of truth for deriving a quest's lifecycle status. Previously
 * this logic was reimplemented (with subtly different edge-case handling —
 * a `<` vs `<=` deadline comparison, missing pool-balance checks, hardcoded
 * status-number magic values) in dashboard.tsx, analytics.tsx, and
 * quest-status-badge-helpers.ts. Everything should derive status from here.
 */
export function getQuestLifecycleStatus(
  quest: { status: QuestStatus; deadline: number; poolBalance?: number },
  nowMs = Date.now()
): QuestLifecycleStatus {
  if (quest.status === QuestStatus.Suspended) return "suspended"
  if (quest.status === QuestStatus.Cancelled) return "cancelled"
  if (quest.status === QuestStatus.Archived) return "archived"
  if (isExpiredDeadline(quest.deadline, nowMs)) return "ended"
  if (quest.poolBalance !== undefined && quest.poolBalance <= 0) return "ended"
  return "active"
}
