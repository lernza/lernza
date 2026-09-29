import { describe, it, expect, beforeEach, vi } from "vitest"
import { TransactionIdempotencyManager } from "./idempotency"
import { TransactionStatus } from "./client"

describe("TransactionIdempotencyManager", () => {
  let manager: TransactionIdempotencyManager

  beforeEach(() => {
    manager = new TransactionIdempotencyManager()
    sessionStorage.clear()
  })

  it("deduplicates concurrent in-flight submissions sharing the same key", async () => {
    let callCount = 0
    const mockAction = vi.fn(async () => {
      callCount++
      await new Promise(resolve => setTimeout(resolve, 50))
      return {
        status: TransactionStatus.Success,
        txHash: "hash_123",
      }
    })

    const p1 = manager.executeIdempotent("test_key_1", mockAction)
    const p2 = manager.executeIdempotent("test_key_1", mockAction)

    expect(manager.isInFlight("test_key_1")).toBe(true)

    const [res1, res2] = await Promise.all([p1, p2])

    expect(callCount).toBe(1)
    expect(res1.txHash).toBe("hash_123")
    expect(res2.txHash).toBe("hash_123")
    expect(manager.isInFlight("test_key_1")).toBe(false)
  })

  it("returns stored submission result from session storage when key is re-used", async () => {
    const mockAction = vi.fn(async () => ({
      status: TransactionStatus.Success,
      txHash: "cached_hash",
    }))

    // First submission
    const res1 = await manager.executeIdempotent("cached_key", mockAction)
    expect(res1.status).toBe(TransactionStatus.Success)
    expect(mockAction).toHaveBeenCalledTimes(1)

    // Second submission after complete (e.g. user retries or double clicked)
    const res2 = await manager.executeIdempotent("cached_key", mockAction)
    expect(res2.txHash).toBe("cached_hash")
    expect(mockAction).toHaveBeenCalledTimes(1) // Still 1, did not re-execute
  })

  it("clears in-flight and stored state when clearKey is called", () => {
    manager.storeSubmission("clear_me", {
      status: TransactionStatus.Success,
      txHash: "h1",
    })

    expect(manager.getStoredSubmission("clear_me")).not.toBeNull()
    manager.clearKey("clear_me")
    expect(manager.getStoredSubmission("clear_me")).toBeNull()
  })
})
