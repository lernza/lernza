import { ChevronRight, Coins, Sparkles, Target, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatTokens } from "@/lib/utils"

export interface QuestCardProps {
  quest: {
    id: number
    name: string
    description: string
    owner?: string
    category?: string
    maxEnrollees?: number
  }
  stats?: {
    enrolleeCount: number
    milestoneCount: number
    poolBalance: number | bigint
  }
  completedCount?: number
  isOwned?: boolean
  onClick?: () => void
}

export function QuestCard({
  quest,
  stats = { enrolleeCount: 0, milestoneCount: 0, poolBalance: 0 },
  completedCount,
  isOwned = false,
  onClick,
}: QuestCardProps) {
  const totalMilestones = stats.milestoneCount
  const hasCompletion = typeof completedCount === "number" && Number.isFinite(completedCount)
  const startedCount = hasCompletion ? completedCount : 0
  const notStarted = !hasCompletion || startedCount === 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open quest ${quest.name}`}
      className="card-tilt group animate-fade-in-up cursor-pointer focus-visible:ring-ring w-full text-left focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-3">
                <CardTitle className="group-hover:text-accent text-base transition-colors">
                  {quest.name}
                </CardTitle>
                {hasCompletion && startedCount === totalMilestones && totalMilestones > 0 && (
                  <Badge variant="success" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Complete
                  </Badge>
                )}
                <Badge variant={isOwned ? "default" : "secondary"} className="text-[10px]">
                  {isOwned ? "Owner" : "Enrolled"}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                {quest.description}
              </p>
            </div>
            <div className="bg-secondary border-border group-hover:bg-accent ml-3 flex h-8 w-8 flex-shrink-0 items-center justify-center border transition-all group-hover:shadow-sm">
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {quest.maxEnrollees ? (
                <>
                  {stats.enrolleeCount}/{quest.maxEnrollees} enrolled (
                  {Math.max(0, quest.maxEnrollees - stats.enrolleeCount)} left)
                </>
              ) : (
                <>{stats.enrolleeCount} enrolled</>
              )}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" />
              {stats.milestoneCount} milestones
            </Badge>
            <Badge variant="default" className="gap-1">
              <Coins className="h-3 w-3" />
              {formatTokens(stats.poolBalance)} USDC
            </Badge>
            {quest.category && (
              <Badge variant="outline" className="text-[10px]">
                {quest.category}
              </Badge>
            )}
          </div>

          {totalMilestones > 0 && (
            <div className="space-y-2">
              {notStarted ? (
                <p
                  className="text-muted-foreground text-xs font-bold"
                  data-testid="quest-progress-not-started"
                >
                  Not started
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <Progress value={startedCount} max={totalMilestones} className="flex-1" />
                  <span className="text-muted-foreground text-xs font-bold whitespace-nowrap">
                    {startedCount}/{totalMilestones} (
                    {Math.round((startedCount / totalMilestones) * 100)}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  )
}
