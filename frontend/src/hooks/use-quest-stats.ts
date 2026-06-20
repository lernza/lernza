import { useQueries } from "@tanstack/react-query"
import { questClient } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"

export interface QuestStatSummary {
  enrolleeCount: number
  milestoneCount: number
  poolBalance: number
}

export const questStatsQueryKey = (questId: number) => ["questStats", questId] as const

export async function fetchQuestStatSummary(questId: number): Promise<QuestStatSummary> {
  const [enrollees, milestoneCount, poolBalance] = await Promise.all([
    questClient.getEnrollees(questId),
    milestoneClient.getMilestoneCount(questId),
    rewardsClient.getPoolBalance(questId),
  ])

  return {
    enrolleeCount: enrollees.length,
    milestoneCount,
    poolBalance:
      poolBalance > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(poolBalance),
  }
}

/**
 * Loads enrollee, milestone, and pool stats per quest via TanStack Query so duplicate
 * quest IDs share one in-flight request (e.g. trending + card lists).
 */
export function useQuestStatsMap(questIds: number[]) {
  const uniqueIds = [...new Set(questIds.filter(id => Number.isInteger(id) && id >= 0))]

  const queries = useQueries({
    queries: uniqueIds.map(questId => ({
      queryKey: questStatsQueryKey(questId),
      queryFn: () => fetchQuestStatSummary(questId),
      enabled: questId >= 0,
    })),
  })

  const statsByQuestId: Record<number, QuestStatSummary> = {}
  uniqueIds.forEach((id, index) => {
    const data = queries[index]?.data
    if (data) {
      statsByQuestId[id] = data
    }
  })

  return {
    statsByQuestId,
    isLoading: queries.some(q => q.isLoading),
    isFetching: queries.some(q => q.isFetching),
    error: queries.find(q => q.error)?.error ?? null,
  }
}
