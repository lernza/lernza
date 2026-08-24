import { describe, it, expect } from "vitest"
import {
  cn,
  shortenAddress,
  formatTokens,
  formatDeadlineLabel,
  getSecondsRemaining,
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
    expect(formatTokens(9_990_000_000)).toBe("999 TOKEN")
  })

  it("formats thousands with one decimal place", () => {
    expect(formatTokens(10_000_000_000)).toBe("1.0K TOKEN")
    expect(formatTokens(15_000_000_000)).toBe("1.5K TOKEN")
    expect(formatTokens(9_999_990_000_000)).toBe("1000.0K TOKEN")
  })

  it("formats millions with one decimal place", () => {
    expect(formatTokens(10_000_000_000_000)).toBe("1.0M TOKEN")
    expect(formatTokens(25_000_000_000_000)).toBe("2.5M TOKEN")
  })

  it("returns error string for negative amounts", () => {
    expect(formatTokens(-100)).toBe("ERROR: Negative TOKEN")
    expect(formatTokens(BigInt(-100))).toBe("ERROR: Negative TOKEN")
    expect(formatTokens(-1000000, 7, "USDC")).toBe("ERROR: Negative USDC")
  })
})

describe("deadline helpers", () => {
  const nowMs = new Date("2026-03-27T12:00:00Z").getTime()
  const nowSeconds = Math.floor(nowMs / 1000)

  it("marks expired deadlines correctly", () => {
    expect(isExpiredDeadline(nowSeconds - 1, nowMs)).toBe(true)
    expect(isExpiredDeadline(nowSeconds + 60, nowMs)).toBe(false)
  })

  it("computes whole seconds remaining", () => {
    expect(getSecondsRemaining(nowSeconds + 90, nowMs)).toBe(90)
    expect(getSecondsRemaining(nowSeconds - 1, nowMs)).toBe(0)
  })

  it("treats a deadline exactly at the current second as expired", () => {
    expect(isExpiredDeadline(nowSeconds, nowMs)).toBe(true)
    expect(getSecondsRemaining(nowSeconds, nowMs)).toBe(0)
  })

  it("handles fractional milliseconds without precision loss", () => {
    const deadline = 1000 // 1000 seconds since epoch

    // 1000.5 seconds since epoch — deadline is behind the current second
    expect(isExpiredDeadline(deadline, 1_000_500)).toBe(true)
    expect(getSecondsRemaining(deadline, 1_000_500)).toBe(0)

    // 1000.999 seconds since epoch — still expired, no float drift
    expect(isExpiredDeadline(deadline, 1_000_999)).toBe(true)

    // 999.999 seconds since epoch — deadline is 1 whole second ahead
    expect(isExpiredDeadline(deadline, 999_999)).toBe(false)
    expect(getSecondsRemaining(deadline, 999_999)).toBe(1)
  })

  it("detects when a deadline is within 24 hours", () => {
    expect(isExpiringSoon(nowSeconds + 60 * 60, nowMs)).toBe(true)
    expect(isExpiringSoon(nowSeconds + 3 * 24 * 60 * 60, nowMs)).toBe(false)
  })

  it("formats relative deadline labels", () => {
    expect(formatDeadlineLabel(0, nowMs)).toBe("No deadline")
    expect(formatDeadlineLabel(nowSeconds - 60, nowMs)).toBe("Expired")
    expect(formatDeadlineLabel(nowSeconds + 2 * 60 * 60, nowMs)).toBe("Expires in 2h")
  })
})
