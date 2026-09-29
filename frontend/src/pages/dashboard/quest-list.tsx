import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VirtualList } from "@/components/ui/virtual-list"
import { EmptyState } from "@/components/ui/async-states"
import { SkeletonQuestList } from "@/components/ui/skeleton"
import { SmartError } from "@/components/error-states"
import { useTranslation } from "@/i18n"
import { DashboardQuestCard } from "./quest-card"
import { DASHBOARD_VIRTUALIZE_THRESHOLD } from "./constants"
import type { QuestInfo } from "@/lib/contract-types"
import type { QuestStatSummary } from "@/hooks/use-quest-stats"
import type { QuestPresetFilter, QuestScopeFilter } from "@/hooks/use-dashboard-filters"

export interface QuestListProps {
  quests: QuestInfo[]
  totalCount: number
  questStats: Record<number, QuestStatSummary | undefined>
  questCompletions: Record<number, number>
  address?: string
  isLoading: boolean
  statsLoading: boolean
  loadError: unknown
  hasMorePublic: boolean
  loadingMore: boolean
  onRetry: () => void
  onLoadMore: () => void
  onOpenQuest: (id: number) => void
  onCreateQuest: () => void
  filter: QuestScopeFilter
  preset: QuestPresetFilter
  category: string
  searchQuery: string
}

export function QuestList({
  quests,
  totalCount,
  questStats,
  questCompletions,
  address,
  isLoading,
  statsLoading,
  loadError,
  hasMorePublic,
  loadingMore,
  onRetry,
  onLoadMore,
  onOpenQuest,
  onCreateQuest,
  filter,
  preset,
  category,
  searchQuery,
}: QuestListProps) {
  const { t } = useTranslation()

  const renderQuestCard = (quest: QuestInfo, index: number) => (
    <DashboardQuestCard
      quest={quest}
      index={index}
      stats={questStats[quest.id]}
      completedCount={questCompletions[quest.id]}
      isOwned={!!address && quest.owner === address}
      onOpen={onOpenQuest}
    />
  )

  // Mirrors the original inline conditions: the error, the list, the "load more"
  // affordance, and the empty state are each gated independently.
  const showLoadMore = (hasMorePublic || totalCount > quests.length) && !isLoading && !loadError
  const showEmpty = totalCount === 0 && !isLoading && !loadError
  const narrowed = !!searchQuery || category !== "all"

  return (
    <>
      {loadError && (
        <div className="mb-5">
          <SmartError message={loadError} onRetry={onRetry} />
        </div>
      )}

      {(isLoading || statsLoading) && <SkeletonQuestList className="mb-5" count={3} />}

      {quests.length > DASHBOARD_VIRTUALIZE_THRESHOLD ? (
        <VirtualList
          items={quests}
          getKey={ws => String(ws.id)}
          height={720}
          itemClassName="pb-4 pb-5"
          renderItem={renderQuestCard}
        />
      ) : (
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {quests.map(renderQuestCard)}
        </div>
      )}

      {showLoadMore && (
        <div className="mt-5 text-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            className="shimmer-on-hover"
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              t("dashboard.loadMore", {
                visible: quests.length,
                total: totalCount,
              })
            )}
          </Button>
        </div>
      )}

      {showEmpty && (
        <div className="mt-5">
          <EmptyState
            variant="default"
            illustration="dashboard"
            title={
              narrowed
                ? t("dashboard.noMatch")
                : preset !== "none"
                  ? t("dashboard.noFilteredQuests", { filter: preset.replace("-", " ") })
                  : filter === "all"
                    ? t("dashboard.noQuestsYet")
                    : t("dashboard.noFilteredQuests", { filter })
            }
            description={
              narrowed
                ? t("dashboard.emptyHint")
                : preset !== "none"
                  ? t("dashboard.emptyHintPreset")
                  : filter === "all"
                    ? t("dashboard.emptyOwnedHint")
                    : filter === "owned"
                      ? t("dashboard.emptyNotOwnedHint")
                      : t("dashboard.emptyEnrolledHint")
            }
            action={
              filter === "all" || filter === "owned"
                ? {
                    label: t("dashboard.createQuest"),
                    onClick: onCreateQuest,
                  }
                : undefined
            }
          />
        </div>
      )}
    </>
  )
}
