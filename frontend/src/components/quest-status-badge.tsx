import { Badge } from "@/components/ui/badge"
import { type QuestInfo } from "@/lib/contract-types"
import { getSecondsRemaining } from "@/lib/utils"
import { getQuestStatusLabel, getQuestStatusVariant } from "./quest-status-badge-helpers"

export { getQuestStatusLabel, getQuestStatusVariant }

interface QuestStatusBadgeProps {
  quest: Pick<QuestInfo, "status" | "deadline">
  poolBalance?: number
  className?: string
}

/**
 * Quest Status badge. Shows Active/Ended/Archived from quest status, deadline,
 * and pool balance. Active quests with a deadline also surface "Xd Xh left".
 */
export function QuestStatusBadge({ quest, poolBalance, className }: QuestStatusBadgeProps) {
  const label = getQuestStatusLabel(quest.status, quest.deadline, poolBalance)
  const variant = getQuestStatusVariant(quest.status, quest.deadline, poolBalance)

  const showTimeRemaining = label === "Active" && quest.deadline > 0
  const timeRemaining = showTimeRemaining ? getSecondsRemaining(quest.deadline) : 0

  const formatTimeRemaining = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))

    if (days > 0) return `${days}d ${hours}h left`
    if (hours > 0) return `${hours}h left`
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
