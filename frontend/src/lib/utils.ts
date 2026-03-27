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
