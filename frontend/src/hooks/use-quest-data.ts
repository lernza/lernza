import { useContractData } from "./use-async-data"
import { questClient, type QuestInfo } from "@/lib/contracts/quest"
import { milestoneClient, type MilestoneInfo } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"

/**
 * Hook to fetch a single quest by ID
 */
export function useQuest(id: number) {
  return useContractData<QuestInfo | null>(
    "quest",
    async () => {
      if (!Number.isInteger(id) || id < 0) {
        throw new Error("Invalid quest id")
      }

      const quest = await questClient.getQuest(id)
      if (!quest) {
        throw new Error("Quest not found")
      }

      return quest
    },
    {
      enabled: Number.isInteger(id) && id >= 0,
      dependencies: [id],
      contractUnavailableMessage:
        "On-chain quest data is unavailable until the quest contract is configured.",
    }
  )
}

/**
 * Hook to fetch milestones for a quest
 */
export function useMilestones(questId: number) {
  return useContractData<MilestoneInfo[]>(
    "milestones",
    async () => {
      if (!Number.isInteger(questId) || questId < 0) {
        throw new Error("Invalid quest id")
      }

      return await milestoneClient.listMilestones(questId)
    },
    {
      enabled: Number.isInteger(questId) && questId >= 0,
      dependencies: [questId],
      contractUnavailableMessage:
        "On-chain milestone data is unavailable until the milestone contract is configured.",
    }
  )
}

/**
 * Hook to fetch enrollees for a quest
 */
export function useEnrollees(questId: number) {
  return useContractData<string[]>(
    "enrollees",
    async () => {
      if (!Number.isInteger(questId) || questId < 0) {
        throw new Error("Invalid quest id")
      }

      return await questClient.getEnrollees(questId)
    },
    {
      enabled: Number.isInteger(questId) && questId >= 0,
      dependencies: [questId],
      contractUnavailableMessage:
        "On-chain enrollee data is unavailable until the quest contract is configured.",
    }
  )
}

/**
 * Hook to fetch reward pool balance for a quest
 */
export function useRewardPool(questId: number) {
  return useContractData<bigint>(
    "rewardPool",
    async () => {
      if (!Number.isInteger(questId) || questId < 0) {
        throw new Error("Invalid quest id")
      }

      return await rewardsClient.getPoolBalance(questId)
    },
    {
      enabled: Number.isInteger(questId) && questId >= 0,
      dependencies: [questId],
      contractUnavailableMessage:
        "On-chain reward pool data is unavailable until the rewards contract is configured.",
    }
  )
}
