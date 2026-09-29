/** Shared module state + helpers for the quest view's on-chain data loading. */

// In-memory cache for completion status: key -> { completed: boolean, timestamp: number }
export const completionCache = new Map<string, { completed: boolean; timestamp: number }>()
export const CACHE_TTL_MS = 60_000 // 60 seconds TTL

export async function fetchWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let currentIndex = 0

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++
      results[idx] = await fn(items[idx])
    }
  })

  await Promise.all(workers)
  return results
}
