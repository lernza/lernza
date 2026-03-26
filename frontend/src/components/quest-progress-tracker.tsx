import { useEffect, useMemo, useState } from "react"
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

// Precompute at module load: Math.random() and Date.now() must not be called during render
const MODULE_NOW = Date.now()
const CONFETTI_COUNT = 20
const confettiStyles = Array.from({ length: CONFETTI_COUNT }, () => ({
  left: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 0.5}s`,
}))

export function QuestProgressTracker({
  milestones,
  totalReward,
  deadline,
  className,
}: QuestProgressTrackerProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  const completedCount = milestones.filter(m => m.completed).length
  const isComplete = completedCount === milestones.length && milestones.length > 0
  const earnedReward = milestones
    .filter(m => m.completed)
    .reduce((sum, m) => sum + m.rewardAmount, 0)
  const remainingReward = totalReward - earnedReward

  useEffect(() => {
    if (!isComplete) return
    // Use setTimeout so setState is not called synchronously inside the effect body
    const showTimer = setTimeout(() => setShowConfetti(true), 0)
    const hideTimer = setTimeout(() => setShowConfetti(false), 3000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [isComplete])

  const timeRemaining = useMemo(
    () => (deadline ? Math.max(0, deadline - MODULE_NOW / 1000) : null),
    [deadline]
  )
  const daysRemaining = timeRemaining ? Math.ceil(timeRemaining / 86400) : null

  return (
    <div className={cn("relative", className)}>
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confettiStyles.map((style, i) => (
            <div
              key={i}
              className="bg-primary animate-confetti absolute h-2 w-2"
              style={{
                left: style.left,
                animationDelay: style.animationDelay,
                backgroundColor: ["var(--color-primary)", "var(--color-success)"][i % 2],
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-background border-border border-[3px] p-5 shadow-[4px_4px_0_var(--color-border)]">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-black tracking-wider uppercase">Quest Progress</span>
          {isComplete && (
            <Badge variant="success" className="animate-bounce gap-1">
              <Sparkles className="h-3 w-3" />
              Complete!
            </Badge>
          )}
        </div>

        <div className="mb-4 flex items-center gap-4">
          <Progress value={completedCount} max={milestones.length} className="flex-1" />
          <span className="text-sm font-black tabular-nums">
            {completedCount}/{milestones.length}
          </span>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Coins className="text-success h-4 w-4" />
            <span className="font-bold text-green-700">+{earnedReward} USDC earned</span>
          </div>
          {remainingReward > 0 && (
            <span className="text-muted-foreground font-bold">
              {remainingReward} USDC remaining
            </span>
          )}
          {daysRemaining !== null && (
            <div className="flex items-center gap-2">
              <Clock className="text-primary h-4 w-4" />
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
                  "border-border flex items-center gap-3 border-[2px] p-3 transition-all",
                  state === "completed" && "bg-success/10 border-success",
                  state === "locked" && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "border-border flex h-6 w-6 flex-shrink-0 items-center justify-center border-[2px]",
                    state === "completed" && "bg-success",
                    state === "pending" && "bg-background hover:bg-secondary cursor-pointer",
                    state === "locked" && "bg-muted"
                  )}
                >
                  {state === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {state === "pending" && <Circle className="text-muted-foreground h-3.5 w-3.5" />}
                  {state === "locked" && <Lock className="text-muted-foreground h-3 w-3" />}
                </div>
                <span
                  className={cn(
                    "flex-1 text-sm font-bold",
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
