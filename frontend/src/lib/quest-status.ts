import { QuestStatus } from "@/lib/contract-types"
import { isExpiredDeadline } from "@/lib/utils"

export type QuestStatusLabel = "Active" | "Ended" | "Archived"
export type QuestStatusVariant = "active" | "archived" | "ended"

/**
 * Derives quest status label from QuestStatus enum, deadline, and pool balance.
 * - Active: Quest is active and not expired
 * - Ended: Quest deadline has passed (regardless of status)
 * - Archived: Quest is explicitly archived
 */
export function getQuestStatusLabel(
  status: QuestStatus,
  deadline: number,
  poolBalance?: number
): QuestStatusLabel {
  if (status === QuestStatus.Archived) {
    return "Archived"
  }

  if (isExpiredDeadline(deadline)) {
    return "Ended"
  }

  if (poolBalance !== undefined && poolBalance <= 0) {
    return "Ended"
  }

  return "Active"
}

/**
 * Gets the badge variant based on quest status.
 */
export function getQuestStatusVariant(
  status: QuestStatus,
  deadline: number,
  poolBalance?: number
): QuestStatusVariant {
  const label = getQuestStatusLabel(status, deadline, poolBalance)

  switch (label) {
    case "Active":
      return "active"
    case "Archived":
      return "archived"
    case "Ended":
      return "ended"
  }
}
