import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { MilestoneClient } from "./milestone-client"

/**
 * Issue #1731 — `withPrerequisites` fired one `get_milestone_prerequisites`
 * RPC call per milestone, on every list call, even though prerequisites are
 * written once at milestone-creation time and never change afterwards.
 *
 * These tests pin the two properties that remove that cost:
 *   1. a repeated read of the same milestone issues no further RPC
 *   2. concurrent readers of the same milestone share a single RPC
 *
 * The contract's `Contract` wrapper is stubbed at the module level because
 * `MilestoneClient` constructs it in the constructor from an env var.
 */

const invokeRead = vi.fn()

vi.mock("@stellar/stellar-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@stellar/stellar-sdk")>("@stellar/stellar-sdk")
  return {
    ...actual,
    Contract: class {
      async simulate() {
        return { result: await invokeRead() }
      }
    },
  }
})

describe("MilestoneClient prerequisite cache (issue #1731)", () => {
  let client: MilestoneClient

  beforeEach(() => {
    invokeRead.mockReset()
    client = new MilestoneClient()
    // The client throws without a contract id; bypass that for these tests.
    ;(client as unknown as { getContract: () => unknown }).getContract = () => ({})
    ;(client as unknown as { invokeRead: unknown }).invokeRead = (...args: unknown[]) =>
      (invokeRead as (...a: unknown[]) => unknown)(...args)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("issues one RPC per milestone and none on a repeat read", async () => {
    invokeRead.mockResolvedValue([])

    await client.getMilestonePrerequisites(7, 1)
    await client.getMilestonePrerequisites(7, 2)
    expect(invokeRead).toHaveBeenCalledTimes(2)

    // Re-reading the same milestones must not hit the network again.
    await client.getMilestonePrerequisites(7, 1)
    await client.getMilestonePrerequisites(7, 2)
    expect(invokeRead).toHaveBeenCalledTimes(2)
  })

  it("collapses concurrent reads of the same milestone into one RPC", async () => {
    let resolveCall: ((value: number[]) => void) | undefined
    invokeRead.mockImplementation(
      () =>
        new Promise<number[]>(resolve => {
          resolveCall = resolve
        })
    )

    // Three callers reach the same milestone before any response lands.
    const a = client.getMilestonePrerequisites(7, 1)
    const b = client.getMilestonePrerequisites(7, 1)
    const c = client.getMilestonePrerequisites(7, 1)

    expect(invokeRead).toHaveBeenCalledTimes(1)

    resolveCall?.([0, 1])

    const [ra, rb, rc] = await Promise.all([a, b, c])
    expect(ra).toEqual([0, 1])
    expect(rb).toEqual([0, 1])
    expect(rc).toEqual([0, 1])
    expect(invokeRead).toHaveBeenCalledTimes(1)
  })

  it("scopes the cache per quest so two quests do not share entries", async () => {
    invokeRead.mockResolvedValueOnce([0]).mockResolvedValueOnce([1, 2])

    expect(await client.getMilestonePrerequisites(1, 1)).toEqual([0])
    expect(await client.getMilestonePrerequisites(2, 1)).toEqual([1, 2])

    // Both are now cached independently.
    expect(await client.getMilestonePrerequisites(1, 1)).toEqual([0])
    expect(await client.getMilestonePrerequisites(2, 1)).toEqual([1, 2])
    expect(invokeRead).toHaveBeenCalledTimes(2)
  })

  it("refetches after invalidation", async () => {
    invokeRead.mockResolvedValueOnce([]).mockResolvedValueOnce([4])

    expect(await client.getMilestonePrerequisites(7, 1)).toEqual([])

    client.invalidatePrerequisites(7, 1)
    expect(await client.getMilestonePrerequisites(7, 1)).toEqual([4])
    expect(invokeRead).toHaveBeenCalledTimes(2)
  })

  it("invalidates every milestone in a quest when no id is given", async () => {
    invokeRead.mockResolvedValue([])

    await client.getMilestonePrerequisites(7, 1)
    await client.getMilestonePrerequisites(7, 2)
    await client.getMilestonePrerequisites(8, 1)
    expect(invokeRead).toHaveBeenCalledTimes(3)

    client.invalidatePrerequisites(7)

    await client.getMilestonePrerequisites(7, 1)
    await client.getMilestonePrerequisites(7, 2)
    expect(invokeRead).toHaveBeenCalledTimes(5)

    // Quest 8 was not invalidated.
    await client.getMilestonePrerequisites(8, 1)
    expect(invokeRead).toHaveBeenCalledTimes(5)
  })

  it("clears the whole cache", async () => {
    invokeRead.mockResolvedValue([])

    await client.getMilestonePrerequisites(1, 1)
    await client.getMilestonePrerequisites(2, 1)
    expect(invokeRead).toHaveBeenCalledTimes(2)

    client.clearPrerequisiteCache()
    await client.getMilestonePrerequisites(1, 1)
    await client.getMilestonePrerequisites(2, 1)
    expect(invokeRead).toHaveBeenCalledTimes(4)
  })

  it("clears the in-flight entry after a rejection so a later read can retry", async () => {
    invokeRead.mockRejectedValueOnce(new Error("rpc down")).mockResolvedValueOnce([9])

    await expect(client.getMilestonePrerequisites(7, 1)).rejects.toThrow("rpc down")

    // The failed read must not be cached, and must not wedge the key.
    expect(await client.getMilestonePrerequisites(7, 1)).toEqual([9])
    expect(invokeRead).toHaveBeenCalledTimes(2)
  })
})
