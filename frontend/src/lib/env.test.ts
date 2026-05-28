import { describe, expect, it } from "vitest"
import { parseClientEnv } from "./env"

describe("parseClientEnv", () => {
  it("uses the Stellar testnet Horizon URL when unset", () => {
    expect(parseClientEnv({}).horizonUrl).toBe("https://horizon-testnet.stellar.org")
  })

  it("accepts a configured Horizon URL", () => {
    expect(parseClientEnv({ VITE_HORIZON_URL: "https://horizon.stellar.org" }).horizonUrl).toBe(
      "https://horizon.stellar.org"
    )
  })

  it("throws during env parsing when VITE_HORIZON_URL is malformed", () => {
    expect(() => parseClientEnv({ VITE_HORIZON_URL: "not-a-url" })).toThrow(
      "VITE_HORIZON_URL must be a valid URL"
    )
  })
})
