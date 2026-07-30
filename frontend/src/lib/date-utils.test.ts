import { describe, it, expect } from "vitest"
import {
  localDateTimeToUTC,
  utcToLocalDateTime,
  getMinDateTimeLocal,
  formatUTCTimestamp,
  getUserTimezoneInfo,
} from "./date-utils"

describe("date-utils", () => {
  describe("localDateTimeToUTC", () => {
    it("converts local datetime string to UTC timestamp", () => {
      // Mock a specific timezone offset (UTC+0 for simplicity)
      const result = localDateTimeToUTC("2026-07-30T15:30")
      expect(typeof result).toBe("number")
      expect(result).toBeGreaterThan(0)
    })

    it("returns 0 for empty string", () => {
      expect(localDateTimeToUTC("")).toBe(0)
    })
  })

  describe("utcToLocalDateTime", () => {
    it("converts UTC timestamp to local datetime string", () => {
      const timestamp = Math.floor(new Date("2026-07-30T15:30:00Z").getTime() / 1000)
      const result = utcToLocalDateTime(timestamp)

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })

    it("returns empty string for 0 timestamp", () => {
      expect(utcToLocalDateTime(0)).toBe("")
    })

    it("returns empty string for negative timestamp", () => {
      expect(utcToLocalDateTime(-1)).toBe("")
    })
  })

  describe("getMinDateTimeLocal", () => {
    it("returns current time in datetime-local format", () => {
      const result = getMinDateTimeLocal()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })
  })

  describe("formatUTCTimestamp", () => {
    it("formats timestamp for display", () => {
      const timestamp = Math.floor(new Date("2026-07-30T15:30:00Z").getTime() / 1000)
      const result = formatUTCTimestamp(timestamp)

      expect(result).toBeTruthy()
      expect(result).not.toBe("No deadline")
    })

    it('returns "No deadline" for 0 timestamp', () => {
      expect(formatUTCTimestamp(0)).toBe("No deadline")
    })

    it('returns "No deadline" for negative timestamp', () => {
      expect(formatUTCTimestamp(-1)).toBe("No deadline")
    })
  })

  describe("getUserTimezoneInfo", () => {
    it("returns timezone offset string", () => {
      const result = getUserTimezoneInfo()
      expect(result).toMatch(/^UTC[+-]\d{2}:\d{2}$/)
    })
  })

  describe("round-trip conversion", () => {
    it("maintains timestamp accuracy through conversion cycle", () => {
      const originalTimestamp = Math.floor(new Date("2026-07-30T15:30:00Z").getTime() / 1000)
      const localString = utcToLocalDateTime(originalTimestamp)
      const backToUTC = localDateTimeToUTC(localString)

      // Allow 60 second tolerance for timezone/rounding differences
      expect(Math.abs(backToUTC - originalTimestamp)).toBeLessThanOrEqual(60)
    })
  })
})
