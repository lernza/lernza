import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatTokens(
  amount: number | bigint,
  decimals: number = 7,
  symbol: string = "TOKEN"
): string {
  const num = Number(amount)

  // Handle very large amounts
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M ${symbol}`
  }

  // Handle thousands
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K ${symbol}`
  }

  // For smaller amounts, show with proper decimal places
  const divisor = Math.pow(10, decimals)
  const formattedAmount = (num / divisor).toFixed(decimals)

  // Remove trailing zeros and add symbol
  return `${Number(formattedAmount).toLocaleString()} ${symbol}`
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
