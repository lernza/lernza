/**
 * Precision-safe token amount formatting, parsing, conversion, and validation.
 * Avoids floating-point precision loss for high-precision Stellar/Soroban tokens (7-18 decimals).
 */

export interface TokenFormatOptions {
  decimals?: number
  symbol?: string
  compact?: boolean
  maxFractionDigits?: number
}

/**
 * Safely parses a human-entered token amount string into atomic unit `bigint`.
 * Prevents precision loss from IEEE-754 floating point arithmetic.
 *
 * @example parseTokenAmount("12.3456789", 7) => 123456789n
 */
export function parseTokenAmount(input: string, decimals = 7): bigint {
  const trimmed = input.trim()
  if (!trimmed || trimmed.startsWith("-")) {
    throw new Error("Invalid token amount: must be a positive number")
  }

  const parts = trimmed.split(".")
  if (parts.length > 2) {
    throw new Error("Invalid token amount: multiple decimal points")
  }

  const [wholeStr = "0", fractionStr = ""] = parts

  if (!/^\d+$/.test(wholeStr) || (fractionStr && !/^\d+$/.test(fractionStr))) {
    throw new Error("Invalid token amount: contains non-numeric characters")
  }

  if (fractionStr.length > decimals) {
    throw new Error(`Exceeds maximum allowed decimal places (${decimals})`)
  }

  const paddedFraction = fractionStr.padEnd(decimals, "0")
  const combinedStr = wholeStr + paddedFraction

  return BigInt(combinedStr)
}

/**
 * Converts atomic unit BigInt (or string/number) into a human-readable display string without precision loss.
 */
export function formatTokenAmount(
  rawAmount: bigint | number | string,
  options: TokenFormatOptions = {}
): string {
  const { decimals = 7, symbol = "TOKEN", compact = false, maxFractionDigits } = options

  let rawBig: bigint
  try {
    if (typeof rawAmount === "bigint") {
      rawBig = rawAmount
    } else if (typeof rawAmount === "number") {
      if (rawAmount < 0) return `ERROR: Negative ${symbol}`
      rawBig = BigInt(Math.floor(rawAmount))
    } else {
      const trimmed = rawAmount.trim()
      if (trimmed.startsWith("-")) return `ERROR: Negative ${symbol}`
      rawBig = BigInt(trimmed)
    }
  } catch {
    return `ERROR: Invalid ${symbol}`
  }

  if (rawBig < 0n) {
    return `ERROR: Negative ${symbol}`
  }

  const base = 10n ** BigInt(decimals)
  const wholePart = rawBig / base
  const fractionPart = rawBig % base

  if (compact) {
    const wholeNum = Number(wholePart)
    if (wholeNum >= 1_000_000_000) {
      return `${(wholeNum / 1_000_000_000).toFixed(1)}B ${symbol}`.trim()
    }
    if (wholeNum >= 1_000_000) {
      return `${(wholeNum / 1_000_000).toFixed(1)}M ${symbol}`.trim()
    }
    if (wholeNum >= 1_000) {
      return `${(wholeNum / 1_000).toFixed(1)}K ${symbol}`.trim()
    }
  }

  let fractionStr = fractionPart.toString().padStart(decimals, "0")

  // Limit fraction digits if requested
  if (maxFractionDigits !== undefined && maxFractionDigits < decimals) {
    fractionStr = fractionStr.slice(0, maxFractionDigits)
  }

  // Remove trailing zeros
  fractionStr = fractionStr.replace(/0+$/, "")

  const formattedWhole = wholePart.toLocaleString("en-US")
  const displayStr = fractionStr ? `${formattedWhole}.${fractionStr}` : formattedWhole

  return symbol ? `${displayStr} ${symbol}` : displayStr
}

/**
 * Validates whether a token amount string is valid and within decimal limits.
 */
export function validateTokenAmount(
  input: string,
  maxDecimals = 7
): { valid: boolean; error?: string } {
  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, error: "Amount is required" }
  }

  if (trimmed.startsWith("-")) {
    return { valid: false, error: "Amount cannot be negative" }
  }

  const parts = trimmed.split(".")
  if (parts.length > 2) {
    return { valid: false, error: "Invalid decimal format" }
  }

  const [whole = "0", fraction = ""] = parts
  if (!/^\d+$/.test(whole) || (fraction && !/^\d+$/.test(fraction))) {
    return { valid: false, error: "Must contain numbers only" }
  }

  if (fraction.length > maxDecimals) {
    return { valid: false, error: `Maximum ${maxDecimals} decimal places allowed` }
  }

  try {
    const raw = parseTokenAmount(input, maxDecimals)
    if (raw === 0n) {
      return { valid: false, error: "Amount must be greater than 0" }
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid amount" }
  }

  return { valid: true }
}

/**
 * Alias helper for raw unit conversion.
 */
export const toRawUnits = parseTokenAmount

/**
 * Alias helper for display unit conversion.
 */
export const toDisplayUnits = (rawAmount: bigint | number | string, decimals = 7): string =>
  formatTokenAmount(rawAmount, { decimals, symbol: "" })
