import { useMemo } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { questClient, type QuestInfo } from "@/lib/contracts/quest"
import { useAsyncData } from "@/hooks/use-async-data"

export type UserRole = "owner" | "learner" | "mixed" | "unknown"

export interface UserRoleData {
  role: UserRole
  isOwner: boolean
  isEnrolled: boolean
  ownedQuests: QuestInfo[]
  enrolledQuests: QuestInfo[]
  isLoading: boolean
  error: string | null
}

const INITIAL_ROLE_DATA: UserRoleData = {
  role: "unknown",
  isOwner: false,
  isEnrolled: false,
  ownedQuests: [],
  enrolledQuests: [],
  isLoading: false,
  error: null,
}

/**
 * Hook to determine user's role based on their participation in quests.
 * Checks if user is a quest owner, learner, or both.
 */
export function useUserRole(): UserRoleData {
  const { address, connected } = useWallet()

  const { data, isLoading, error } = useAsyncData(
    async () => {
      if (!address) return INITIAL_ROLE_DATA

      // Fetch owned and enrolled quests in parallel for efficiency
      const [ownedQuests, enrolledQuests] = await Promise.all([
        questClient.listQuestsByOwner(address),
        questClient.listQuestsByEnrollee(address),
      ])

      const isOwner = ownedQuests.length > 0
      const isEnrolled = enrolledQuests.length > 0

      // Determine role based on participation
      let role: UserRole = "unknown"
      if (isOwner && isEnrolled) {
        role = "mixed"
      } else if (isOwner) {
        role = "owner"
      } else if (isEnrolled) {
        role = "learner"
      }

      return {
        role,
        isOwner,
        isEnrolled,
        ownedQuests,
        enrolledQuests,
        isLoading: false,
        error: null,
      }
    },
    {
      enabled: connected && !!address,
      dependencies: [address, connected],
    }
  )

  return useMemo(() => {
    if (!connected || !address) {
      return INITIAL_ROLE_DATA
    }

    if (data) {
      return {
        ...data,
        isLoading,
        error,
      }
    }

    return {
      ...INITIAL_ROLE_DATA,
      isLoading,
      error,
    }
  }, [connected, address, data, isLoading, error])
}
