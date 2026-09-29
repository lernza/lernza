import { describe, expect, it } from "vitest"
import {
  getAllowedRewardTokens,
  REWARD_TOKEN_ALLOWLIST_VERSION,
  validateTokenMetadata,
} from "./reward-tokens"

describe("reward token allowlist", () => {
  it("keeps testnet assets separate from production", () => {
    expect(getAllowedRewardTokens("staging")).toHaveLength(1)
    expect(getAllowedRewardTokens("production")).toHaveLength(0)
  })

  it("exposes a version and rejects mismatched on-chain metadata", () => {
    const token = getAllowedRewardTokens("staging")[0]
    expect(REWARD_TOKEN_ALLOWLIST_VERSION).toBe("1.0.0")
    expect(validateTokenMetadata(token, { ...token, name: "Impostor Coin" })).toContain(
      "reports name Impostor Coin"
    )
    expect(validateTokenMetadata(token, token)).toBeNull()
  })
})
