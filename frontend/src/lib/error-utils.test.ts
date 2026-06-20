import { describe, it, expect, vi } from "vitest"
import { safeContractCall } from "./error-utils"

describe("safeContractCall", () => {
  it("returns the resolved value when the function succeeds", async () => {
    const result = await safeContractCall(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it("re-throws plain errors unchanged", async () => {
    const err = new Error("Something broke")
    await expect(safeContractCall(() => Promise.reject(err))).rejects.toThrow("Something broke")
  })

  it("wraps HostError messages with a contract-call-failed prefix", async () => {
    const err = new Error("HostError: trap: MalformedXdr")
    await expect(safeContractCall(() => Promise.reject(err))).rejects.toThrow(
      /contract call failed/i
    )
  })

  it("wraps Error(Contract, #N) codes with a human-readable code prefix", async () => {
    const err = new Error("transaction simulation failed: Error(Contract, #4)")
    await expect(safeContractCall(() => Promise.reject(err))).rejects.toThrow(/contract error #4/i)
  })

  it("preserves the original message after the contract error prefix", async () => {
    const err = new Error("Error(Contract, #7) the quest is full")
    const rejected = safeContractCall(() => Promise.reject(err))
    await expect(rejected).rejects.toThrow(/the quest is full/i)
  })

  it("wraps network-related messages with a network error prefix", async () => {
    const err = new Error("failed to fetch")
    await expect(safeContractCall(() => Promise.reject(err))).rejects.toThrow(/network error/i)
  })

  it("wraps 'could not detect network' messages with a network error prefix", async () => {
    const err = new Error("could not detect network")
    await expect(safeContractCall(() => Promise.reject(err))).rejects.toThrow(/network error/i)
  })

  it("converts non-Error rejections to Error objects", async () => {
    await expect(safeContractCall(() => Promise.reject("string rejection"))).rejects.toBeInstanceOf(
      Error
    )
  })

  it("passes through the return value of async functions correctly", async () => {
    const data = { id: 1, name: "Quest" }
    const result = await safeContractCall(async () => data)
    expect(result).toEqual(data)
  })

  it("does not swallow the error — always re-throws", async () => {
    const spy = vi.fn().mockRejectedValue(new Error("Error(Contract, #99)"))
    await expect(safeContractCall(spy)).rejects.toThrow()
  })
})
