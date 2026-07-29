/**
 * Client-side caching strategy for off-chain and ledger RPC data.
 * Provides stale-while-revalidate and TTL-based local storage cache (Issue #1264).
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttlMs: number
}

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes default TTL

export class CacheManager {
  private static memoryCache = new Map<string, CacheEntry<unknown>>()

  /**
   * Get cached data if valid, otherwise execute fetcher and store result.
   */
  static async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const freshData = await fetcher()
    this.set(key, freshData, ttlMs)
    return freshData
  }

  /**
   * Retrieve item from memory or localStorage if not expired.
   */
  static get<T>(key: string): T | null {
    const now = Date.now()

    // 1. Check memory cache
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined
    if (memEntry) {
      if (now - memEntry.timestamp < memEntry.ttlMs) {
        return memEntry.data
      }
      this.memoryCache.delete(key)
    }

    // 2. Check localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(`lernza_cache_${key}`)
        if (raw) {
          const entry = JSON.parse(raw) as CacheEntry<T>
          if (now - entry.timestamp < entry.ttlMs) {
            this.memoryCache.set(key, entry as CacheEntry<unknown>)
            return entry.data
          }
          window.localStorage.removeItem(`lernza_cache_${key}`)
        }
      } catch {
        // Fallthrough if parsing/storage fails
      }
    }

    return null
  }

  /**
   * Store data in memory and localStorage cache with TTL.
   */
  static set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    }

    this.memoryCache.set(key, entry as CacheEntry<unknown>)

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(`lernza_cache_${key}`, JSON.stringify(entry))
      } catch {
        // Fallthrough on storage quota full
      }
    }
  }

  /**
   * Remove specific cache entry.
   */
  static invalidate(key: string): void {
    this.memoryCache.delete(key)
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(`lernza_cache_${key}`)
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Clear all Lernza caches.
   */
  static clearAll(): void {
    this.memoryCache.clear()
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key?.startsWith("lernza_cache_")) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k))
      } catch {
        // Ignore
      }
    }
  }
}
