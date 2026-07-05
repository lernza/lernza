 
import { Progress } from "@/components/ui/progress"
import { formatTokens } from "@/lib/utils"

interface QuestProgressProps {
  completedMilestones: number
  totalMilestones: number
  earnedReward: number
}

export function QuestProgress({
  completedMilestones,
  totalMilestones,
  earnedReward,
}: QuestProgressProps) {
  if (totalMilestones === 0) return null

  return (
    <div className="animate-fade-in-up stagger-3 mb-8">
      <div className="bg-background border-border border p-5 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Overall Progress</span>
          <div className="flex items-center gap-3">
            {earnedReward > 0 && (
              <span className="text-xs font-bold text-green-700">
                +{formatTokens(earnedReward)} USDC earned
              </span>
            )}
            <span className="text-sm font-semibold">
              {completedMilestones}/{totalMilestones}
            </span>
          </div>
        </div>
        <Progress value={completedMilestones} max={totalMilestones} />
      </div>
    </div>
  )
}
