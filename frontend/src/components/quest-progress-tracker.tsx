import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Lock, Sparkles, Clock, Coins } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Milestone {
  id: number
  title: string
  rewardAmount: number
  completed?: boolean
}

interface QuestProgressTrackerProps {
  milestones: Milestone[]
  totalReward: number
  deadline?: number
  className?: string
}

type MilestoneState = "completed" | "pending" | "locked"

function getMilestoneState(index: number, milestones: Milestone[]): MilestoneState {
  if (milestones[index].completed) return "completed"
  if (index === 0) return "pending"
  if (milestones[index - 1].completed) return "pending"
  return "locked"
}

export function QuestProgressTracker({
  milestones,
  totalReward,
  deadline,
  className,
}: QuestProgressTrackerProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const completedCount = milestones.filter((m) => m.completed).length
  const isComplete = completedCount === milestones.length && milestones.length > 0
  const earnedReward = milestones
    .filter((m) => m.completed)
    .reduce((sum, m) => sum + m.rewardAmount, 0)
  const remainingReward = totalReward - earnedReward

  useEffect(() => {
    if (isComplete) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  const timeRemaining = deadline ? Math.max(0, deadline - Date.now() / 1000) : null
  const daysRemaining = timeRemaining ? Math.ceil(timeRemaining / 86400) : null

  return (
    <div className={cn("relative", className)}>
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ["var(--color-primary)", "var(--color-success)"][i % 2],
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-background border-[3px] border-border shadow-[4px_4px_0_var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black uppercase tracking-wider">Quest Progress</span>
          {isComplete && (
            <Badge variant="success" className="gap-1 animate-bounce">
              <Sparkles className="h-3 w-3" />
              Complete!
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Progress value={completedCount} max={milestones.length} className="flex-1" />
          <span className="text-sm font-black tabular-nums">
            {completedCount}/{milestones.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-success" />
            <span className="font-bold text-green-700">+{earnedReward} USDC earned</span>
          </div>
          {remainingReward > 0 && (
            <span className="text-muted-foreground font-bold">
              {remainingReward} USDC remaining
            </span>
          )}
          {daysRemaining !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-bold">{daysRemaining} days left</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {milestones.map((ms, i) => {
            const state = getMilestoneState(i, milestones)
            return (
              <div
                key={ms.id}
                className={cn(
                  "flex items-center gap-3 p-3 border-[2px] border-border transition-all",
                  state === "completed" && "bg-success/10 border-success",
                  state === "locked" && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 border-[2px] border-border flex items-center justify-center flex-shrink-0",
                    state === "completed" && "bg-success",
                    state === "pending" && "bg-background hover:bg-secondary cursor-pointer",
                    state === "locked" && "bg-muted"
                  )}
                >
                  {state === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {state === "pending" && <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                  {state === "locked" && <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span
                  className={cn(
                    "font-bold text-sm flex-1",
                    state === "completed" && "text-muted-foreground line-through"
                  )}
                >
                  {ms.title}
                </span>
                <Badge variant={state === "completed" ? "success" : "default"}>
                  {ms.rewardAmount} USDC
                </Badge>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
