import { describe, expect, it } from "vitest"
import {
  CERTIFICATE_ERROR_CODES,
  COMPLETION_ERROR_CODES,
  MILESTONE_ERROR_CODES,
  QUEST_ERROR_CODES,
  REWARDS_ERROR_CODES,
  getContractErrorMap,
  mapContractError,
  parseContractErrorCode,
  resolveContractErrorScope,
} from "./contract-errors"

const quest = (code: number) => `Error(Contract, #${code})`

describe("parseContractErrorCode", () => {
  it("extracts the code from a Soroban revert string", () => {
    expect(parseContractErrorCode(quest(12))).toBe(12)
  })

  it("tolerates the whitespace variants Soroban and Horizon emit", () => {
    expect(parseContractErrorCode("Error(Contract,#12)")).toBe(12)
    expect(parseContractErrorCode("Error(Contract,  #12)")).toBe(12)
  })

  it("finds the code inside a larger simulation-failure message", () => {
    expect(parseContractErrorCode(`transaction simulation failed: ${quest(7)}`)).toBe(7)
  })

  it("returns null when there is no contract error code", () => {
    expect(parseContractErrorCode("user rejected the request")).toBeNull()
    expect(parseContractErrorCode("")).toBeNull()
    expect(parseContractErrorCode(undefined)).toBeNull()
  })
})

// The three contracts below all define code 1 as `NotFound` but for a different
// entity. Merging the tables (the old `{...A, ...B, ...C}` default) meant a
// quest revert rendered as "Reward pool not found." — the bug these tests pin.
describe("mapContractError scopes lookups to the calling contract", () => {
  it("resolves quest error code 1 to the quest message", () => {
    expect(mapContractError(quest(1), "quest")).toBe("Quest not found.")
  })

  it("resolves milestone error code 1 to the milestone message", () => {
    expect(mapContractError(quest(1), "milestone")).toBe("Milestone not found.")
  })

  it("resolves rewards error code 1 to the rewards message", () => {
    expect(mapContractError(quest(1), "rewards")).toBe("Reward pool not found.")
  })

  it("does not let one contract's table answer for another's codes", () => {
    // Code 4 is AlreadyEnrolled on quest, AlreadyCompleted on milestone and
    // InsufficientPool on rewards.
    expect(mapContractError(quest(4), "quest")).toBe("You are already enrolled in this quest.")
    expect(mapContractError(quest(4), "milestone")).toBe(
      "This milestone has already been verified."
    )
    expect(mapContractError(quest(4), "rewards")).toBe(
      "The reward pool does not have enough balance."
    )
  })

  it("maps quest codes that the old table reported against the wrong variant", () => {
    // The pre-existing table claimed 6/9/10 were "not enrolled" / "deadline
    // passed" / "invalid visibility"; the contract says otherwise.
    expect(mapContractError(quest(6), "quest")).toBe("This learner is not enrolled in this quest.")
    expect(mapContractError(quest(9), "quest")).toBe("The quest title is too long.")
    expect(mapContractError(quest(10), "quest")).toBe("The quest description is too long.")
  })

  it("keeps a code the scoped contract does not define unresolved", () => {
    // Completion has no code 20, so nothing is invented for it.
    expect(mapContractError(quest(20), "completion")).toBe(quest(20))
  })

  it("falls back to the original message when there is no contract code", () => {
    expect(mapContractError("user rejected the request", "quest")).toBe("user rejected the request")
  })

  it("accepts an unrecognised scope without throwing, resolving unscoped", () => {
    // A stale contract id in the environment must not crash error rendering.
    expect(mapContractError(quest(1), "C_NOT_A_CONTRACT")).toContain("error code #1")
  })
})

describe("mapContractError without a scope", () => {
  it("translates a code every contract words identically", () => {
    // Paused is 400 in every Lernza contract with one shared message.
    expect(mapContractError(quest(400))).toBe(
      "This feature is temporarily paused. Please try again later."
    )
  })

  it("refuses to guess when contracts disagree on a code", () => {
    const mapped = mapContractError(quest(1))
    expect(mapped).not.toBe("Reward pool not found.")
    expect(mapped).not.toBe("Milestone not found.")
    expect(mapped).toContain("#1")
  })

  it("returns the original message for an unknown code", () => {
    expect(mapContractError(quest(99999))).toBe(quest(99999))
  })
})

describe("resolveContractErrorScope", () => {
  it("resolves scope names, case- and whitespace-insensitively", () => {
    expect(resolveContractErrorScope("quest")).toBe("quest")
    expect(resolveContractErrorScope("  MILESTONE ")).toBe("milestone")
  })

  it("returns undefined for empty and unknown input", () => {
    expect(resolveContractErrorScope(undefined)).toBeUndefined()
    expect(resolveContractErrorScope(null)).toBeUndefined()
    expect(resolveContractErrorScope("")).toBeUndefined()
    expect(resolveContractErrorScope("CDLZAAAAAAAAAAAAAAAAAAAAAAAAAAAJKLK")).toBeUndefined()
  })

  it("resolves a configured contract address to its scope", async () => {
    const { contractAddresses } = await import("./contracts/config")
    const address = contractAddresses.milestone
    if (!address) return // no contract configured in this environment
    expect(resolveContractErrorScope(address)).toBe("milestone")
  })
})

describe("getContractErrorMap", () => {
  it("returns the table for each scope", () => {
    expect(getContractErrorMap("quest")?.[1]).toBe("Quest not found.")
    expect(getContractErrorMap("milestone")?.[1]).toBe("Milestone not found.")
    expect(getContractErrorMap("certificate")?.[1]).toBe("Certificate not found.")
    expect(getContractErrorMap("completion")?.[1]).toBe(
      "The completion contract is not configured."
    )
  })

  it("has no entry for an unknown scope", () => {
    expect(getContractErrorMap("nope")).toBeUndefined()
    expect(getContractErrorMap(undefined)).toBeUndefined()
  })
})

// The tables are typed `satisfies Record<Code, string>` against a transcription
// of each Rust `pub enum Error`, which is what makes this hold at compile time.
// These assertions are the runtime half: they fail loudly if a discriminant is
// added to the Rust enum without a message landing here.
describe("error code tables match the contract enums", () => {
  it("covers every milestone discriminant, and no others", () => {
    const codes = Object.values(MILESTONE_ERROR_CODES).sort((a, b) => a - b)
    const mapped = getContractErrorMap("milestone")!
    expect(
      Object.keys(mapped)
        .map(Number)
        .sort((a, b) => a - b)
    ).toEqual(codes)
    expect(codes).toEqual([
      1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
      27, 28, 29, 30, 31, 400,
    ])
  })

  it("gives every milestone code a non-empty message", () => {
    const mapped = getContractErrorMap("milestone")!
    for (const code of Object.values(MILESTONE_ERROR_CODES)) {
      expect(mapped[code], `milestone code #${code}`).toBeTruthy()
    }
  })

  it("covers the quest, rewards, certificate and completion code spaces", () => {
    for (const [scope, codes] of [
      ["quest", QUEST_ERROR_CODES],
      ["rewards", REWARDS_ERROR_CODES],
      ["certificate", CERTIFICATE_ERROR_CODES],
      ["completion", COMPLETION_ERROR_CODES],
    ] as const) {
      const mapped = getContractErrorMap(scope)!
      expect(
        Object.keys(mapped)
          .map(Number)
          .sort((a, b) => a - b),
        scope
      ).toEqual(Object.values(codes).sort((a, b) => a - b))
      for (const code of Object.values(codes)) {
        expect(mapped[code], `${scope} code #${code}`).toBeTruthy()
      }
    }
  })

  it("keeps the shared paused band identical across contracts", () => {
    for (const scope of ["quest", "milestone", "rewards", "certificate"]) {
      expect(getContractErrorMap(scope)?.[400], scope).toBe(
        "This feature is temporarily paused. Please try again later."
      )
    }
  })
})
