import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  cn,
  shortenAddress,
  formatTokens,
  formatDeadlineLabel,
  isExpiredDeadline,
  isExpiringSoon,
  setPageMeta,
  resetPageMeta,
} from "./utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("filters falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar")
  })

  it("handles conditional objects", () => {
    expect(cn({ "font-bold": true, italic: false })).toBe("font-bold")
  })

  it("returns empty string when no valid classes are passed", () => {
    expect(cn(false, undefined)).toBe("")
  })
})

describe("shortenAddress", () => {
  const ADDR = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRS"

  it("shortens to 4 chars by default", () => {
    expect(shortenAddress(ADDR)).toBe(`${ADDR.slice(0, 4)}...${ADDR.slice(-4)}`)
  })

  it("respects a custom chars argument", () => {
    expect(shortenAddress(ADDR, 6)).toBe(`${ADDR.slice(0, 6)}...${ADDR.slice(-6)}`)
  })

  it("works on a minimal-length address", () => {
    expect(shortenAddress("GABCD1234", 4)).toBe("GABC...1234")
  })
})

describe("formatTokens", () => {
  it("returns raw localized string for values below 1 000", () => {
    expect(formatTokens(0)).toBe("0 TOKEN")
    expect(formatTokens(999)).toBe("999 TOKEN")
  })

  it("formats thousands with one decimal place", () => {
    expect(formatTokens(1_000)).toBe("1.0K TOKEN")
    expect(formatTokens(1_500)).toBe("1.5K TOKEN")
    expect(formatTokens(999_999)).toBe("1000.0K TOKEN")
  })

  it("formats millions with one decimal place", () => {
    expect(formatTokens(1_000_000)).toBe("1.0M TOKEN")
    expect(formatTokens(2_500_000)).toBe("2.5M TOKEN")
  })
})

describe("deadline helpers", () => {
  const nowMs = new Date("2026-03-27T12:00:00Z").getTime()

  it("marks expired deadlines correctly", () => {
    expect(isExpiredDeadline(Math.floor(nowMs / 1000) - 1, nowMs)).toBe(true)
    expect(isExpiredDeadline(Math.floor(nowMs / 1000) + 60, nowMs)).toBe(false)
  })

  it("detects when a deadline is within 24 hours", () => {
    expect(isExpiringSoon(Math.floor(nowMs / 1000) + 60 * 60, nowMs)).toBe(true)
    expect(isExpiringSoon(Math.floor(nowMs / 1000) + 3 * 24 * 60 * 60, nowMs)).toBe(false)
  })

  it("formats relative deadline labels", () => {
    expect(formatDeadlineLabel(0, nowMs)).toBe("No deadline")
    expect(formatDeadlineLabel(Math.floor(nowMs / 1000) - 60, nowMs)).toBe("Expired")
    expect(formatDeadlineLabel(Math.floor(nowMs / 1000) + 2 * 60 * 60, nowMs)).toBe("Expires in 2h")
  })
})

// ---------------------------------------------------------------------------
// setPageMeta / resetPageMeta
// ---------------------------------------------------------------------------

type MetaSpec = { attr: "name" | "property"; val: string; content: string }

const META_SEEDS: MetaSpec[] = [
  { attr: "name", val: "description", content: "Default desc" },
  { attr: "property", val: "og:title", content: "Default OG title" },
  { attr: "property", val: "og:description", content: "Default OG desc" },
  { attr: "name", val: "twitter:title", content: "Default TW title" },
  { attr: "name", val: "twitter:description", content: "Default TW desc" },
  { attr: "property", val: "og:image", content: "https://lernza.com/og-image.png" },
  { attr: "name", val: "twitter:image", content: "https://lernza.com/og-image.png" },
  { attr: "name", val: "twitter:image:src", content: "https://lernza.com/og-image.png" },
]

function getContent(attr: "name" | "property", val: string): string | null {
  return (
    document.querySelector<HTMLMetaElement>(`meta[${attr}='${val}']`)?.getAttribute("content") ??
    null
  )
}

describe("setPageMeta / resetPageMeta", () => {
  beforeEach(() => {
    document.title = "Default"
    for (const { attr, val, content } of META_SEEDS) {
      const el = document.createElement("meta")
      el.setAttribute(attr, val)
      el.setAttribute("content", content)
      document.head.appendChild(el)
    }
  })

  afterEach(() => {
    document.head.querySelectorAll("meta").forEach(el => el.remove())
  })

  it("updates document.title and all OG / Twitter meta tags", () => {
    setPageMeta("Quest: Rust 101 on Lernza", "Learn Rust and earn tokens.")

    expect(document.title).toBe("Quest: Rust 101 on Lernza")
    expect(getContent("property", "og:title")).toBe("Quest: Rust 101 on Lernza")
    expect(getContent("name", "twitter:title")).toBe("Quest: Rust 101 on Lernza")
    expect(getContent("name", "description")).toBe("Learn Rust and earn tokens.")
    expect(getContent("property", "og:description")).toBe("Learn Rust and earn tokens.")
    expect(getContent("name", "twitter:description")).toBe("Learn Rust and earn tokens.")
  })

  it("does not touch image tags when imageUrl is omitted", () => {
    setPageMeta("Quest: Rust 101 on Lernza", "Learn Rust.")

    expect(getContent("property", "og:image")).toBe("https://lernza.com/og-image.png")
    expect(getContent("name", "twitter:image")).toBe("https://lernza.com/og-image.png")
  })

  it("overrides image tags when imageUrl is provided", () => {
    setPageMeta("Quest: Rust 101 on Lernza", "Learn Rust.", "https://lernza.com/quest-1.png")

    expect(getContent("property", "og:image")).toBe("https://lernza.com/quest-1.png")
    expect(getContent("name", "twitter:image")).toBe("https://lernza.com/quest-1.png")
    expect(getContent("name", "twitter:image:src")).toBe("https://lernza.com/quest-1.png")
  })

  it("resets all tags back to site defaults via resetPageMeta", () => {
    setPageMeta("Quest: Rust 101 on Lernza", "Learn Rust.")
    resetPageMeta()

    expect(document.title).toBe("Lernza \u2014 Learn. Earn. On-chain.")
    expect(getContent("property", "og:title")).toBe("Lernza \u2014 Learn. Earn. On-chain.")
    expect(getContent("name", "twitter:title")).toBe("Lernza \u2014 Learn. Earn. On-chain.")
  })
})
