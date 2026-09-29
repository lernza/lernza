import { describe, it, expect } from "vitest"
import { xdr } from "@stellar/stellar-sdk"
import type * as rpc from "@stellar/stellar-sdk/rpc"
import { parseEvent } from "./use-quest-events"

/**
 * The contract payload layouts asserted here are taken from the published
 * events in `contracts/milestone/src/lib.rs`, not from the frontend:
 *
 *   partial_completion   (quest_id, milestone_id, enrollee, criteria_met, max_criteria, reward)
 *   milestone_feedback   (quest_id, milestone_id, enrollee, reviewer, action, comment)
 *
 * The two tests below each cover a defect that made the frontend blind to a
 * real class of notification: a topic name that no contract emits, and a payload
 * element that was decoded but thrown away.
 */

const QUEST_ID = 7
const MILESTONE_ID = 2
const ENROLLEE = "GENROLLEE000000000000000000000000000000000AA"
const REVIEWER = "GREVIEWER000000000000000000000000000000000BB"

function topicBytes(symbol: string): xdr.ScVal {
  const bytes = Array.from(new TextEncoder().encode(symbol))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
  return xdr.ScVal.scvBytes(Buffer.from(bytes, "hex"))
}

function event(symbol: string, data: xdr.ScVal[]): rpc.Api.EventResponse {
  return {
    ledger: 1234,
    txHash: "abc123",
    contractId: "CQUEST0000000000000000000000000000000000000000000000000000000000CC",
    type: "contract",
    topic: [topicBytes(symbol)],
    value: xdr.ScVal.scvVec(data),
    inSuccessfulContractCall: true,
  } as unknown as rpc.Api.EventResponse
}

const u32 = (n: number) => xdr.ScVal.scvU32(n)
const addr = (a: string) => xdr.ScVal.scvAddress(a)
const str = (s: string) => xdr.ScVal.scvString(s)
const i128 = (n: bigint) => {
  // An `i128` is four 32-bit limbs, little-endian: lo.low, lo.high, hi.low,
  // hi.high.
  const lo = Number(n & 0xffff_ffffn)
  const loHigh = Number((n >> 32n) & 0xffff_ffffn)
  const hi = Number((n >> 64n) & 0xffff_ffffn)
  const hiHigh = Number((n >> 96n) & 0xffff_ffffn)
  return xdr.ScVal.scvI128({ lo: { low: lo, high: loHigh }, hi: { low: hi, high: hiHigh } })
}

describe("parseEvent: partial_completion", () => {
  const payload = event("partial_completion", [
    u32(QUEST_ID),
    u32(MILESTONE_ID),
    addr(ENROLLEE),
    u32(2),
    u32(5),
    i128(1500n),
  ])

  it("matches the topic the milestone contract actually emits", () => {
    // The frontend previously listened for `milestone_partial`, which no
    // contract publishes, so partial-credit notifications could never fire.
    const parsed = parseEvent(payload)
    expect(parsed?.type).toBe("partial_completion")
  })

  it("decodes the criteria and the released reward", () => {
    const parsed = parseEvent(payload)
    expect(parsed).toMatchObject({
      questId: QUEST_ID,
      milestoneId: MILESTONE_ID,
      enrollee: ENROLLEE,
      criteriaMet: 2,
      maxCriteria: 5,
    })
    expect(parsed?.amount).toBe(1500n)
  })

  it("does not match the non-existent legacy topic name", () => {
    const wrong = event("milestone_partial", [
      u32(QUEST_ID),
      u32(MILESTONE_ID),
      addr(ENROLLEE),
      u32(2),
      u32(5),
      i128(1500n),
    ])
    expect(parseEvent(wrong)).toBeNull()
  })
})

describe("parseEvent: milestone_feedback", () => {
  const payload = (action: number, comment: string) =>
    event("milestone_feedback", [
      u32(QUEST_ID),
      u32(MILESTONE_ID),
      addr(ENROLLEE),
      addr(REVIEWER),
      u32(action),
      str(comment),
    ])

  it("captures the reviewer's comment", () => {
    // This was the sixth payload element and was silently discarded, so a
    // learner was told a milestone was approved without ever seeing why.
    const parsed = parseEvent(payload(0, "Clean tests, well structured."))
    expect(parsed?.comment).toBe("Clean tests, well structured.")
    expect(parsed?.reviewer).toBe(REVIEWER)
  })

  it("captures the comment for a changes-requested verdict too", () => {
    const parsed = parseEvent(payload(2, "Please add error handling."))
    expect(parsed?.comment).toBe("Please add error handling.")
    expect(parsed?.action).toBe(2)
  })

  it("yields an empty comment when the reviewer left none", () => {
    const parsed = parseEvent(payload(0, ""))
    expect(parsed?.comment).toBe("")
  })
})

describe("parseEvent: reward amounts", () => {
  // `decodeScValI128` used to call `parts.hi()`/`parts.lo()` as methods when the
  // SDK returns plain records, so every amount threw, was swallowed by the
  // catch, and became 0n. Reward notifications then rendered a generic label
  // instead of an amount. These tests fail against that version.
  const payout = (amount: bigint) =>
    event("reward_distributed", [
      u32(QUEST_ID),
      u32(MILESTONE_ID),
      addr(ENROLLEE),
      i128(amount),
      u32(1700000000),
    ])

  it("decodes a small amount", () => {
    expect(parseEvent(payout(1500n))?.amount).toBe(1500n)
  })

  it("decodes an amount larger than 32 bits, exercising the upper limbs", () => {
    // A token supply in stroops comfortably exceeds 2^32; a decoder that only
    // read the low limb would silently truncate.
    const amount = 12_345_678_901_234n
    expect(parseEvent(payout(amount))?.amount).toBe(amount)
  })

  it("decodes a negative amount without wrapping", () => {
    // `reward_refunded` and pool adjustments can carry a negative delta.
    expect(parseEvent(payout(-42n))?.amount).toBe(-42n)
  })

  it("decodes zero as zero", () => {
    expect(parseEvent(payout(0n))?.amount).toBe(0n)
  })

  it("decodes reward_funded amounts", () => {
    const funded = event("reward_funded", [u32(QUEST_ID), addr(ENROLLEE), i128(5_000_000n)])
    expect(parseEvent(funded)?.amount).toBe(5_000_000n)
  })
})
