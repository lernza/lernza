import { useQuery } from "@tanstack/react-query"
import { questClient, type QuestInfo } from "@/lib/contracts/quest"
import { milestoneClient, type MilestoneInfo } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"

const CONTRACT_UNAVAILABLE = "not configured"

function contractError(name: string, fallback?: string): string {
  return fallback ?? `On-chain data is unavailable until the ${name} contract is configured.`
}

function mapError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.message.includes(CONTRACT_UNAVAILABLE)) return fallback
    return err.message
  }
  return fallback
}

export function useQuest(id: number) {
  const enabled = Number.isInteger(id) && id >= 0
  const query = useQuery<QuestInfo | null, Error>({
    queryKey: ["quest", id],
    queryFn: async () => {
      if (!Number.isInteger(id) || id < 0) throw new Error("Invalid quest id")
      const quest = await questClient.getQuest(id)
      if (!quest) throw new Error("Quest not found")
      return quest
    },
    enabled,
  })

  const errMsg = query.error
    ? mapError(
        query.error,
        contractError(
          "quest",
          "On-chain quest data is unavailable until the quest contract is configured."
        )
      )
    : null

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: errMsg,
    isEmpty: !query.data,
    refetch: (): Promise<void> => query.refetch().then(() => undefined),
  }
}

export function useMilestones(questId: number) {
  const enabled = Number.isInteger(questId) && questId >= 0
  const query = useQuery<MilestoneInfo[], Error>({
    queryKey: ["milestones", questId],
    queryFn: async () => {
      if (!Number.isInteger(questId) || questId < 0) throw new Error("Invalid quest id")
      return milestoneClient.listMilestones(questId)
    },
    enabled,
  })

  const errMsg = query.error
    ? mapError(
        query.error,
        contractError(
          "milestone",
          "On-chain milestone data is unavailable until the milestone contract is configured."
        )
      )
    : null

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: errMsg,
    isEmpty: !query.data || query.data.length === 0,
    refetch: (): Promise<void> => query.refetch().then(() => undefined),
  }
}

export function useEnrollees(questId: number) {
  const enabled = Number.isInteger(questId) && questId >= 0
  const query = useQuery<string[], Error>({
    queryKey: ["enrollees", questId],
    queryFn: async () => {
      if (!Number.isInteger(questId) || questId < 0) throw new Error("Invalid quest id")
      return questClient.getEnrollees(questId)
    },
    enabled,
  })

  const errMsg = query.error
    ? mapError(
        query.error,
        contractError(
          "quest",
          "On-chain enrollee data is unavailable until the quest contract is configured."
        )
      )
    : null

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: errMsg,
    isEmpty: !query.data || query.data.length === 0,
    refetch: (): Promise<void> => query.refetch().then(() => undefined),
  }
}

export function useRewardPool(questId: number) {
  const enabled = Number.isInteger(questId) && questId >= 0
  const query = useQuery<bigint, Error>({
    queryKey: ["rewardPool", questId],
    queryFn: async () => {
      if (!Number.isInteger(questId) || questId < 0) throw new Error("Invalid quest id")
      return rewardsClient.getPoolBalance(questId)
    },
    enabled,
  })

  const errMsg = query.error
    ? mapError(
        query.error,
        contractError(
          "rewards",
          "On-chain reward pool data is unavailable until the rewards contract is configured."
        )
      )
    : null

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: errMsg,
    isEmpty: !query.data,
    refetch: (): Promise<void> => query.refetch().then(() => undefined),
  }
}
