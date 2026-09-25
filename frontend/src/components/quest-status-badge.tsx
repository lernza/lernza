import { Archive, CircleDot, Clock3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { type QuestInfo } from "@/lib/contract-types"
import { getSecondsRemaining } from "@/lib/utils"
import { useNow } from "@/hooks/use-now"
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
  // Ticking clock so the remaining time (and the Active -> Ended transition)
  // stays accurate instead of freezing at the value seen on first paint
  // (issue #1335).
  const nowMs = useNow()

  const label = getQuestStatusLabel(quest.status, quest.deadline, poolBalance)
  const variant = getQuestStatusVariant(quest.status, quest.deadline, poolBalance)
  const Icon = label === "Active" ? CircleDot : label === "Ended" ? Clock3 : Archive

  const showTimeRemaining = label === "Active" && quest.deadline > 0
  const timeRemaining = showTimeRemaining ? getSecondsRemaining(quest.deadline, nowMs) : 0

  const formatTimeRemaining = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))

    if (days > 0) return `${days}d ${hours}h left`
    if (hours > 0) return `${hours}h left`
    return "Ending soon"
  }

  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3" />
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
