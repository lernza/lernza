import { describe, it, expect } from "vitest"
import {
  cn,
  shortenAddress,
  formatTokens,
  formatDeadlineLabel,
  isExpiredDeadline,
  isExpiringSoon,
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
