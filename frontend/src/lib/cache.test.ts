import { describe, it, expect, beforeEach } from "vitest"
import { CacheManager } from "./cache"

describe("CacheManager", () => {
  beforeEach(() => {
    CacheManager.clearAll()
  })

  it("stores and retrieves item from cache", () => {
    CacheManager.set("key1", { value: 123 }, 5000)
    const result = CacheManager.get<{ value: number }>("key1")
    expect(result).toEqual({ value: 123 })
  })

  it("executes fetcher when cache is empty", async () => {
    const fetcher = async () => "fetched_data"
    const data = await CacheManager.getOrFetch("key2", fetcher, 5000)
    expect(data).toBe("fetched_data")
  })

  it("invalidates cache entry", () => {
    CacheManager.set("key3", "test", 5000)
    CacheManager.invalidate("key3")
    expect(CacheManager.get("key3")).toBeNull()
  })
})
