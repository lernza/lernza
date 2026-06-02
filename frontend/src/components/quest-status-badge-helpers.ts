import { QuestStatus } from "@/lib/contract-types"
import { isExpiredDeadline } from "@/lib/utils"

/**
 * Derives quest status label from QuestStatus enum, deadline, and pool balance.
 * - Active: Quest is active and not expired
 * - Ended: Quest deadline has passed or pool is empty
 * - Archived: Quest is explicitly archived
 */
export function getQuestStatusLabel(
  status: QuestStatus,
  deadline: number,
  poolBalance?: number
): "Active" | "Ended" | "Archived" {
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
): "active" | "archived" | "ended" {
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
