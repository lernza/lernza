import { useEffect, useMemo, useState } from "react"
import { milestoneClient } from "@/lib/contracts/milestone"
import { completionCache, CACHE_TTL_MS, fetchWithConcurrency } from "./completion-cache"

export interface UseQuestCompletionsParams {
  questId: number
  enrolleeAddresses: string[]
  milestones: { id: number }[]
}

/**
 * Loads per-milestone completion status for every enrollee, with a 60s
 * in-memory cache and bounded concurrency to avoid flooding the RPC endpoint.
 */
export function useQuestCompletions({
  questId,
  enrolleeAddresses,
  milestones,
}: UseQuestCompletionsParams) {
  // Fetch completion status for each enrollee x milestone combination
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({})

  // Load completions when enrollees or milestones change with caching and 15-worker concurrency
  useEffect(() => {
    if (enrolleeAddresses.length === 0 || milestones.length === 0) {
      setCompletionMap({})
      return
    }

    let cancelled = false

    const loadCompletions = async () => {
      try {
        const pairs: Array<{ enrollee: string; milestoneId: number }> = []
        for (const enrollee of enrolleeAddresses) {
          for (const milestone of milestones) {
            pairs.push({ enrollee, milestoneId: milestone.id })
          }
        }

        const now = Date.now()
        const entries = await fetchWithConcurrency(pairs, 15, async ({ enrollee, milestoneId }) => {
          const cacheKey = `${questId}-${enrollee}-${milestoneId}`
          const cached = completionCache.get(cacheKey)
          if (cached && now - cached.timestamp < CACHE_TTL_MS) {
            return [`${enrollee}-${milestoneId}`, cached.completed] as [string, boolean]
          }

          try {
            const completed = await milestoneClient.isCompleted(questId, milestoneId, enrollee)
            completionCache.set(cacheKey, { completed, timestamp: now })
            return [`${enrollee}-${milestoneId}`, completed] as [string, boolean]
          } catch {
            return [`${enrollee}-${milestoneId}`, false] as [string, boolean]
          }
        })

        if (!cancelled) {
          setCompletionMap(Object.fromEntries(entries))
        }
      } catch {
        // Silently handle — completions will show as incomplete
      }
    }

    void loadCompletions()
    return () => {
      cancelled = true
    }
  }, [questId, enrolleeAddresses, milestones])

  // Build completions array from the map for section components
  // Build completions array from the map for section components
  const completions = useMemo(() => {
    const result: { milestoneId: number; enrollee: string; completed: boolean }[] = []
    for (const enrollee of enrolleeAddresses) {
      for (const milestone of milestones) {
        const key = `${enrollee}-${milestone.id}`
        if (completionMap[key]) {
          result.push({ milestoneId: milestone.id, enrollee, completed: true })
        }
      }
    }
    return result
  }, [enrolleeAddresses, milestones, completionMap])

  return { completions }
}
