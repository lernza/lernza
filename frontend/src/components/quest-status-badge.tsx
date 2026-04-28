import { Badge } from "@/components/ui/badge"
import { QuestStatus, type QuestInfo } from "@/lib/contract-types"
import { isExpiredDeadline, getSecondsRemaining } from "@/lib/utils"

interface QuestStatusBadgeProps {
  quest: Pick<QuestInfo, "status" | "deadline">
  poolBalance?: number
  className?: string
}

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
): "Active" | "Ended" | "Archived" {
  // If explicitly archived, show Archived
  if (status === QuestStatus.Archived) {
    return "Archived"
  }

  // If deadline has passed, show Ended
  if (isExpiredDeadline(deadline)) {
    return "Ended"
  }

  // If pool is empty (all rewards distributed), show Ended
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

/**
 * Quest Status badge component.
 * Shows Active/Ended/Archived based on quest status, deadline, and pool balance.
 */
export function QuestStatusBadge({ quest, poolBalance, className }: QuestStatusBadgeProps) {
  const label = getQuestStatusLabel(quest.status, quest.deadline, poolBalance)
  const variant = getQuestStatusVariant(quest.status, quest.deadline, poolBalance)

  // For Active quests, show time remaining if deadline is set
  const showTimeRemaining = label === "Active" && quest.deadline > 0
  const timeRemaining = showTimeRemaining
    ? getSecondsRemaining(quest.deadline)
    : 0

  const formatTimeRemaining = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))

    if (days > 0) {
      return `${days}d ${hours}h left`
    }
    if (hours > 0) {
      return `${hours}h left`
    }
    return "Ending soon"
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
      {showTimeRemaining && (
        <span className="ml-1 opacity-80">
          {" · "}
          {formatTimeRemaining(timeRemaining)}
        </span>
      )}
    </Badge>
  )
}