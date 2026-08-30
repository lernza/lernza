import { describe, expect, it } from "vitest"
import {
  formatTokenAmount,
  parseTokenAmount,
  toDisplayUnits,
  toRawUnits,
  validateTokenAmount,
} from "./token-amount"

describe("token-amount utility", () => {
  describe("parseTokenAmount / toRawUnits", () => {
    it("parses whole numbers into raw atomic units", () => {
      expect(parseTokenAmount("100", 7)).toBe(1000000000n)
      expect(parseTokenAmount("0", 7)).toBe(0n)
    })

    it("parses fractional amounts accurately without float error", () => {
      expect(parseTokenAmount("12.3456789", 7)).toBe(123456789n)
      expect(parseTokenAmount("0.0000001", 7)).toBe(1n)
      expect(parseTokenAmount("1.5", 7)).toBe(15000000n)
    })

    it("throws errors on invalid inputs", () => {
      expect(() => parseTokenAmount("-5", 7)).toThrow("must be a positive number")
      expect(() => parseTokenAmount("12.3.4", 7)).toThrow("multiple decimal points")
      expect(() => parseTokenAmount("12.12345678", 7)).toThrow("Exceeds maximum allowed decimal places")
      expect(() => parseTokenAmount("abc", 7)).toThrow("contains non-numeric characters")
    })
  })

  describe("formatTokenAmount", () => {
    it("formats raw bigint amounts to display string", () => {
      expect(formatTokenAmount(1000000000n, { decimals: 7, symbol: "LEARN" })).toBe("100 LEARN")
      expect(formatTokenAmount(123456789n, { decimals: 7, symbol: "LEARN" })).toBe("12.3456789 LEARN")
      expect(formatTokenAmount(0n, { decimals: 7, symbol: "LEARN" })).toBe("0 LEARN")
    })

    it("supports compact formatting for thousands and millions", () => {
      expect(formatTokenAmount(10000000000n, { decimals: 7, symbol: "LEARN", compact: true })).toBe("1.0K LEARN")
      expect(formatTokenAmount(25000000000000n, { decimals: 7, symbol: "LEARN", compact: true })).toBe("2.5M LEARN")
    })

    it("handles negative and invalid values gracefully", () => {
      expect(formatTokenAmount(-100n, { symbol: "LEARN" })).toBe("ERROR: Negative LEARN")
      expect(formatTokenAmount("invalid", { symbol: "LEARN" })).toBe("ERROR: Invalid LEARN")
    })
  })

  describe("validateTokenAmount", () => {
    it("validates correct amounts", () => {
      expect(validateTokenAmount("10.5", 7)).toEqual({ valid: true })
      expect(validateTokenAmount("0.0000001", 7)).toEqual({ valid: true })
    })

    it("returns error objects for invalid inputs", () => {
      expect(validateTokenAmount("", 7).valid).toBe(false)
      expect(validateTokenAmount("-10", 7).valid).toBe(false)
      expect(validateTokenAmount("0", 7).valid).toBe(false)
      expect(validateTokenAmount("1.12345678", 7).valid).toBe(false)
    })
  })

  describe("toDisplayUnits", () => {
    it("formats string without symbol suffix", () => {
      expect(toDisplayUnits(15000000n, 7)).toBe("1.5")
    })
  })
})
