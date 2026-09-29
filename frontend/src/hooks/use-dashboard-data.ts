import { questClient } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"
import { useContractData } from "@/hooks/use-async-data"
import { useQuestStatsMap } from "@/hooks/use-quest-stats"
import { logger } from "@/lib/logger"
import type { QuestInfo } from "@/lib/contract-types"
import { DASHBOARD_QUEST_PAGE_SIZE } from "@/pages/dashboard/constants"

/** Fresh empty payload used before the first successful load. */
const emptyDashboardData = () => ({
  publicQuests: [] as QuestInfo[],
  ownedQuests: [] as QuestInfo[],
  enrolledQuests: [] as QuestInfo[],
  accessibleQuests: [] as QuestInfo[],
  previewQuestIds: [] as number[],
  questCompletions: {} as Record<number, number>,
  userEarnings: 0n,
})

/**
 * Loads everything the dashboard needs from the contracts: the first page of
 * public quests, the connected user's own/enrolled quests, per-milestone
 * completion counts, and total earnings. Stays refetchable so the error state
 * can offer a retry.
 */
export function useDashboardData({ connected, address }: { connected: boolean; address?: string }) {
  const { data, isLoading, error, refetch } = useContractData(
    "dashboard",
    async () => {
      const publicQuests = await questClient.listPublicQuests(0, DASHBOARD_QUEST_PAGE_SIZE)
      const [ownedQuests, enrolledQuests] = address
        ? await Promise.all([
            questClient.listQuestsByOwner(address),
            questClient.listQuestsByEnrollee(address),
          ])
        : [[], []]

      const allQuests = [...publicQuests, ...ownedQuests, ...enrolledQuests]
      if (allQuests.length === 0) {
        logger.warn("[Dashboard] No quests loaded from any source")
      }

      const questMap = new Map(allQuests.map(quest => [quest.id, quest] as const))

      if (questMap.size < allQuests.length) {
        logger.warn(`[Dashboard] Deduplication lost ${allQuests.length - questMap.size} quest(s)`, {
          before: allQuests.length,
          after: questMap.size,
        })
      }

      const accessibleQuests = Array.from(questMap.values())

      const previewAllQuests = [
        ...publicQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
        ...ownedQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
        ...enrolledQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
      ]

      if (previewAllQuests.length === 0) {
        logger.warn("[Dashboard] No preview quests loaded from any source")
      }

      const previewQuestMap = new Map(previewAllQuests.map(quest => [quest.id, quest] as const))

      if (previewQuestMap.size < previewAllQuests.length) {
        logger.warn(
          `[Dashboard] Preview deduplication lost ${previewAllQuests.length - previewQuestMap.size} quest(s)`,
          { before: previewAllQuests.length, after: previewQuestMap.size }
        )
      }

      const previewQuests = Array.from(previewQuestMap.values())

      let questCompletions: Record<number, number> = {}
      let userEarnings = 0n
      if (address) {
        const [completionEntries, earnings] = await Promise.all([
          Promise.all(
            previewQuests.map(async q => {
              const completed = await milestoneClient.getEnrolleeCompletions(q.id, address)
              return [q.id, completed] as const
            })
          ),
          rewardsClient.getUserEarnings(address),
        ])
        questCompletions = Object.fromEntries(completionEntries)
        userEarnings = earnings
      }

      return {
        publicQuests,
        ownedQuests,
        enrolledQuests,
        accessibleQuests,
        previewQuestIds: previewQuests.map(q => q.id),
        questCompletions,
        userEarnings,
      }
    },
    {
      enabled: connected,
      queryKey: [connected, address],
    }
  )

  // Fall back to empty arrays so downstream `.map`/`.filter` never need a guard.
  const {
    publicQuests = [],
    ownedQuests = [],
    enrolledQuests = [],
    accessibleQuests = [],
    previewQuestIds = [],
    questCompletions = {},
    userEarnings = 0n,
  } = data || emptyDashboardData()

  const { statsByQuestId: questStats, isLoading: questStatsLoading } =
    useQuestStatsMap(previewQuestIds)

  return {
    publicQuests,
    ownedQuests,
    enrolledQuests,
    accessibleQuests,
    questCompletions,
    userEarnings,
    questStats,
    questStatsLoading,
    isLoading,
    loadError: error,
    refetch,
  }
}
