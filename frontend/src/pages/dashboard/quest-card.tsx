import { Users, Target, Coins, ChevronRight, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { prefetchQuestData } from "@/hooks/use-quest-data"
import { queryClient } from "@/lib/query-client"
import { useTokenSymbol } from "@/hooks/use-token-symbol"
import { formatTokens } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import type { QuestInfo } from "@/lib/contract-types"
import type { QuestStatSummary } from "@/hooks/use-quest-stats"

export interface DashboardQuestCardProps {
  quest: QuestInfo
  index: number
  stats?: QuestStatSummary
  completedCount?: number
  isOwned: boolean
  onOpen: (id: number) => void
}

export function DashboardQuestCard({
  quest,
  index,
  stats,
  completedCount,
  isOwned,
  onOpen,
}: DashboardQuestCardProps) {
  const { t } = useTranslation()
  const { symbol } = useTokenSymbol()

  const resolvedStats = stats || {
    enrolleeCount: 0,
    milestoneCount: 0,
    poolBalance: 0,
  }
  const totalMilestones = resolvedStats.milestoneCount
  // Treat missing/null completion as unknown — never coerce to 0% which
  // looks like "started but empty". See #1331.
  const hasCompletion = typeof completedCount === "number" && Number.isFinite(completedCount)
  const startedCount = hasCompletion ? completedCount : 0
  const notStarted = !hasCompletion || startedCount === 0
  const totalReward = resolvedStats.poolBalance
  const earnedReward =
    totalMilestones > 0 && hasCompletion ? (totalReward * startedCount) / totalMilestones : 0

  return (
    <button
      type="button"
      onClick={() => onOpen(quest.id)}
      onMouseEnter={() => void prefetchQuestData(queryClient, quest.id)}
      onFocus={() => void prefetchQuestData(queryClient, quest.id)}
      aria-label={`Open quest ${quest.name}`}
      data-onboarding={index === 0 ? "quest-card" : undefined}
      className={`card-tilt group animate-fade-in-up cursor-pointer stagger-${index + 1} focus-visible:ring-ring w-full text-left focus-visible:ring-2 focus-visible:outline-none`}
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
                    {t("quest.status.completed")}
                  </Badge>
                )}
                <Badge variant={isOwned ? "default" : "secondary"} className="text-[10px]">
                  {isOwned ? t("quest.status.owner") : t("quest.status.enrolled")}
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
              {quest.maxEnrollees
                ? t("quest.enrolledOfMax", {
                    count: resolvedStats.enrolleeCount,
                    max: quest.maxEnrollees,
                    left: Math.max(0, quest.maxEnrollees - resolvedStats.enrolleeCount),
                  })
                : t("common.enrolled", { count: resolvedStats.enrolleeCount })}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" />
              {t("common.milestones", { count: resolvedStats.milestoneCount })}
            </Badge>
            <Badge variant="default" className="gap-1">
              <Coins className="h-3 w-3" />
              {formatTokens(resolvedStats.poolBalance, 7, symbol)}
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
                  {t("dashboard.notStarted")}
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <Progress value={startedCount} max={totalMilestones} className="flex-1" />
                  <span className="text-muted-foreground text-xs font-bold whitespace-nowrap">
                    {startedCount}/{totalMilestones}
                  </span>
                </div>
              )}
              {earnedReward > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-bold">
                    {t("dashboard.earnedSoFar")}
                  </span>
                  <span className="text-xs font-semibold text-green-700">
                    +{formatTokens(earnedReward, 7, symbol)} /{" "}
                    {formatTokens(totalReward, 7, symbol)}
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
