import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useIdempotentTransaction } from "./use-idempotent-transaction"
import { idempotencyManager } from "@/lib/contracts/idempotency"
import { TransactionStatus } from "@/lib/contracts/client"

describe("useIdempotentTransaction", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("suppresses rapid duplicate clicks and executes only once", async () => {
    let callCount = 0
    const mockAction = vi.fn(async () => {
      callCount++
      await new Promise(resolve => setTimeout(resolve, 30))
      return {
        status: TransactionStatus.Success,
        txHash: "hash_double_click",
      }
    })

    const { result } = renderHook(() =>
      useIdempotentTransaction({ idempotencyKey: "btn_action_key" })
    )

    let p1: Promise<unknown>
    let p2: Promise<unknown>

    await act(async () => {
      p1 = result.current.submit(mockAction)
      p2 = result.current.submit(mockAction)
      await Promise.all([p1, p2])
    })

    expect(callCount).toBe(1)
    expect(result.current.isSubmitting).toBe(false)
  })

  it("invokes onSuccess callback on successful transaction submission", async () => {
    const onSuccess = vi.fn()
    const mockAction = vi.fn(async () => ({
      status: TransactionStatus.Success,
      txHash: "success_hash",
    }))

    const { result } = renderHook(() =>
      useIdempotentTransaction({ idempotencyKey: "success_key", onSuccess })
    )

    await act(async () => {
      await result.current.submit(mockAction)
    })

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransactionStatus.Success,
        txHash: "success_hash",
      })
    )
  })
})
