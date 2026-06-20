import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatTokens(amount: number | bigint, decimals = 7, symbol = "TOKEN"): string {
  const adjusted = Number(amount) / Math.pow(10, decimals)

  if (adjusted >= 1_000_000) {
    return `${(adjusted / 1_000_000).toFixed(1)}M ${symbol}`
  }

  if (adjusted >= 1_000) {
    return `${(adjusted / 1_000).toFixed(1)}K ${symbol}`
  }

  return `${adjusted.toLocaleString(undefined, { maximumFractionDigits: decimals })} ${symbol}`
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

// ---------------------------------------------------------------------------
// Page metadata helpers (Open Graph / Twitter Card / document.title)
// ---------------------------------------------------------------------------

const DEFAULT_TITLE = "Lernza — Learn. Earn. On-chain."
const DEFAULT_DESCRIPTION =
  "The first learn-to-earn platform on Stellar. Create quests, set milestones, reward learners with tokens."

function setMeta(selector: string, value: string): void {
  const el = document.querySelector<HTMLMetaElement>(selector)
  if (el) el.setAttribute("content", value)
}

/**
 * Dynamically updates `document.title` and all OG / Twitter meta tags.
 * Call with `imageUrl` to also override the share image.
 */
export function setPageMeta(title: string, description: string, imageUrl?: string): void {
  document.title = title

  setMeta("meta[name='description']", description)
  setMeta("meta[property='og:title']", title)
  setMeta("meta[property='og:description']", description)
  setMeta("meta[name='twitter:title']", title)
  setMeta("meta[name='twitter:description']", description)

  if (imageUrl) {
    setMeta("meta[property='og:image']", imageUrl)
    setMeta("meta[name='twitter:image']", imageUrl)
    setMeta("meta[name='twitter:image:src']", imageUrl)
  }
}

/** Resets all page metadata back to the site-wide defaults from index.html. */
export function resetPageMeta(): void {
  setPageMeta(DEFAULT_TITLE, DEFAULT_DESCRIPTION)
}
