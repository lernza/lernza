import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatTokens(amount: number | bigint): string {
  const num = Number(amount)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

export function getSecondsRemaining(deadline: number, nowMs = Date.now()): number {
  return Math.max(0, Math.floor(deadline - nowMs / 1000))
}

export function isExpiredDeadline(deadline: number, nowMs = Date.now()): boolean {
  return deadline > 0 && deadline <= nowMs / 1000
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
