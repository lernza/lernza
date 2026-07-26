import { CheckCircle2, Coins, Sparkles } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface ProgressPanelProps {
  completedMilestones: number
  totalMilestones: number
  earnedReward: number
}

export function ProgressPanel({
  completedMilestones,
  totalMilestones,
  earnedReward,
}: ProgressPanelProps) {
  const isComplete = completedMilestones === totalMilestones && totalMilestones > 0
  const progressPercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  return (
    <div className="mb-8 border-border bg-card border p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wider uppercase">Quest Progress</span>
        {isComplete && (
          <Badge variant="success" className="animate-bounce gap-1">
            <Sparkles className="h-3 w-3" />
            Complete!
          </Badge>
        )}
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Progress value={progressPercent} max={100} className="flex-1" />
        <span className="text-sm font-semibold tabular-nums">
          {completedMilestones}/{totalMilestones}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <CheckCircle2 className="text-success h-5 w-5" />
        <div className="flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Earned Reward
          </p>
          <p className="text-lg font-bold text-green-700">+{earnedReward} USDC</p>
        </div>
      </div>
    </div>
  )
}
