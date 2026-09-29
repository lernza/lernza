import { QuestStatus } from "@/lib/contract-types"
import { getQuestLifecycleStatus } from "@/lib/utils"

/**
 * Derives quest status label from QuestStatus enum, deadline, and pool balance.
 * Delegates to getQuestLifecycleStatus() in lib/utils.ts, the single source
 * of truth for this logic — see that function's doc comment.
 */
export function getQuestStatusLabel(
  status: QuestStatus,
  deadline: number,
  poolBalance?: number
): "Active" | "Ended" | "Archived" | "Cancelled" | "Suspended" {
  const lifecycle = getQuestLifecycleStatus({ status, deadline, poolBalance })

  switch (lifecycle) {
    case "active":
      return "Active"
    case "ended":
      return "Ended"
    case "archived":
      return "Archived"
    case "cancelled":
      return "Cancelled"
    case "suspended":
      return "Suspended"
  }
}

/**
 * Gets the badge variant based on quest status.
 */
export function getQuestStatusVariant(
  status: QuestStatus,
  deadline: number,
  poolBalance?: number
): "active" | "archived" | "ended" | "suspended" {
  const label = getQuestStatusLabel(status, deadline, poolBalance)

  switch (label) {
    case "Active":
      return "active"
    case "Archived":
    case "Cancelled":
      return "archived"
    case "Ended":
      return "ended"
    case "Suspended":
      return "suspended"
  }
}
