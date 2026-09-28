import { useCallback, useEffect, useState } from "react"
import { questClient } from "@/lib/contracts/quest"
import { useWallet } from "@/hooks/use-wallet"
import { useTokenSymbol } from "@/hooks/use-token-symbol"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useDashboardFilters } from "@/hooks/use-dashboard-filters"
import { navigateToPath } from "@/lib/navigation"
import { SectionErrorBoundary } from "@/components/error-boundary"
import type { QuestInfo, CategoryInfo } from "@/lib/contract-types"
import {
  DASHBOARD_LOAD_MORE_SIZE,
  DASHBOARD_QUEST_PAGE_SIZE,
  RECENT_ACTIVITY_LIMIT,
  TRENDING_QUEST_LIMIT,
} from "./dashboard/constants"
import { OnboardingBanner } from "./dashboard/onboarding-banner"
import { WelcomeBanner } from "./dashboard/welcome-banner"
import { DashboardStats } from "./dashboard/dashboard-stats"
import { FilterPanel } from "./dashboard/filter-panel"
import { QuestList } from "./dashboard/quest-list"
import { TrendingQuests } from "./dashboard/trending-quests"
import { RecentActivity } from "./dashboard/recent-activity"
import { PageMetadata } from "@/components/PageMetadata"
import { PAGE_METADATA } from "@/lib/page-metadata"

interface DashboardProps {
  onSelectQuest?: (id: number) => void
  onCreateQuest?: () => void
  /** Optional callback to open the onboarding tutorial */
  onLaunchTutorial?: () => void
}

export function Dashboard(
  { onSelectQuest, onCreateQuest, onLaunchTutorial }: DashboardProps = {} as DashboardProps
) {
  const { symbol } = useTokenSymbol()
  const { connected, connect, shortAddress, address } = useWallet()
  const onboarding = useOnboarding()

  // Incremental, contract-side pagination of the public quest feed so the
  // dashboard never renders all (potentially hundreds of) quests at once.
  // Only `DASHBOARD_QUEST_PAGE_SIZE` public quests are loaded initially; further
  // pages are fetched ("load 20 at a time") as the user requests more.
  const [extraPublicQuests, setExtraPublicQuests] = useState<QuestInfo[]>([])
  const [hasMorePublic, setHasMorePublic] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Surface category-listing expiry so users are warned before a category (and
  // its quests) disappears from discovery — issue #1348.
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null)

  // Dashboard data stays refetchable so error-state retry can reload the full view.
  const {
    publicQuests,
    ownedQuests,
    enrolledQuests,
    accessibleQuests,
    questCompletions,
    userEarnings,
    questStats,
    questStatsLoading,
    isLoading,
    loadError,
    refetch,
  } = useDashboardData({ connected, address })

  // When the first page of public quests arrives at full size, there are likely
  // more pages available on the contract to be loaded on demand.
  useEffect(() => {
    if (publicQuests.length === DASHBOARD_QUEST_PAGE_SIZE) {
      setHasMorePublic(true)
    }
  }, [publicQuests])

  // Fetch the next page of public quests from the contract and append it.
  const loadMorePublic = useCallback(async () => {
    const loaded = publicQuests.length + extraPublicQuests.length
    setLoadingMore(true)
    try {
      const next = await questClient.listPublicQuests(loaded, DASHBOARD_LOAD_MORE_SIZE)
      if (!Array.isArray(next) || next.length === 0) {
        setHasMorePublic(false)
        return
      }
      setExtraPublicQuests(prev => [...prev, ...next])
      setHasMorePublic(next.length === DASHBOARD_LOAD_MORE_SIZE)
    } catch {
      setHasMorePublic(false)
    } finally {
      setLoadingMore(false)
    }
  }, [publicQuests, extraPublicQuests])

  // All filter/sort/search/tag/pagination state is owned by useDashboardFilters.
  const filters = useDashboardFilters({
    publicQuests,
    ownedQuests,
    enrolledQuests,
    extraPublicQuests,
    questStats,
  })

  // Look up the listing details for the selected category so the panel can warn
  // about upcoming expiry.
  useEffect(() => {
    const selected = filters.category
    if (selected === "all" || !questClient.getCategory) {
      setCategoryInfo(null)
      return
    }
    let active = true
    questClient
      .getCategory(selected)
      .then(info => {
        if (active) setCategoryInfo(info)
      })
      .catch(() => {
        if (active) setCategoryInfo(null)
      })
    return () => {
      active = false
    }
  }, [filters.category])

  const goToQuest = (id: number) => {
    if (onSelectQuest) {
      onSelectQuest(id)
      return
    }
    navigateToPath(`/quest/${id}`)
  }

  const goToCreateQuest = () => {
    if (!connected) {
      connect()
      return
    }
    if (onCreateQuest) {
      onCreateQuest()
      return
    }
    navigateToPath("/create-quest")
  }

  const milestonesCompleted = (Object.values(questCompletions) as number[]).reduce(
    (sum: number, count: number) => sum + count,
    0
  )

  const userEarningsBigInt =
    typeof userEarnings === "bigint" ? userEarnings : BigInt(userEarnings || 0)
  const personalStats = {
    totalEarned: userEarningsBigInt,
    questsOwned: ownedQuests.length,
    questsEnrolled: enrolledQuests.length,
    milestonesCompleted,
  }

  const trendingQuests = [...publicQuests]
    .sort((a, b) => (questStats[b.id]?.enrolleeCount || 0) - (questStats[a.id]?.enrolleeCount || 0))
    .slice(0, TRENDING_QUEST_LIMIT)

  const recentActivity = accessibleQuests
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(ws => ({
      id: `created-${ws.id}`,
      user: ws.owner,
      action: "created" as const,
      questName: ws.name,
      timestamp: ws.createdAt * 1000,
    }))

  const currentMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date())
  const earningsChartCapped = userEarningsBigInt > BigInt(Number.MAX_SAFE_INTEGER)
  const earningsHistory = [
    { date: "Start", amount: 0 },
    {
      date: currentMonth,
      amount: earningsChartCapped ? Number.MAX_SAFE_INTEGER : Number(userEarningsBigInt),
    },
  ]

  const commitTag = (tag: string) => {
    if (tag && !filters.selectedTags.includes(tag)) {
      filters.setSelectedTags(prev => [...prev, tag])
    }
    filters.setTagInput("")
  }

  const loadMore = () => {
    filters.setDisplayCount(prev => prev + DASHBOARD_LOAD_MORE_SIZE)
    if (hasMorePublic) void loadMorePublic()
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <OnboardingBanner onboarding={onboarding} />

      <WelcomeBanner
        connected={connected}
        address={address}
        shortAddress={shortAddress}
        questsEnrolled={personalStats.questsEnrolled}
        onCreateQuest={goToCreateQuest}
        onLaunchTutorial={onLaunchTutorial}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Personal Stats, Chart, Quests) */}
        <div className="animate-fade-in-up stagger-2 space-y-8 lg:col-span-2">
          {connected && <DashboardStats personalStats={personalStats} earningsHistory={earningsHistory} />}

          {/* Your Quests Section */}
          <SectionErrorBoundary label="Your quests">
            <div>
              <FilterPanel
                filter={filters.filter}
                onFilterChange={filters.setFilter}
                connected={connected}
                search={filters.search}
                onSearchChange={filters.setSearch}
                category={filters.category}
                onCategoryChange={filters.setCategory}
                availableCategories={filters.availableCategories}
                creatorFilter={filters.creatorFilter}
                onCreatorFilterChange={filters.setCreatorFilter}
                availableCreators={filters.availableCreators}
                address={address}
                rewardTokenFilter={filters.rewardTokenFilter}
                onRewardTokenFilterChange={filters.setRewardTokenFilter}
                availableRewardTokens={filters.availableRewardTokens}
                sortBy={filters.sortBy}
                onSortByChange={filters.setSortBy}
                tagInput={filters.tagInput}
                onTagInputChange={filters.setTagInput}
                onTagCommit={commitTag}
                selectedTags={filters.selectedTags}
                onSelectedTagsChange={filters.setSelectedTags}
                tagSuggestions={filters.tagSuggestions}
                tagFilterMode={filters.tagFilterMode}
                onTagFilterModeChange={filters.setTagFilterMode}
                categoryInfo={categoryInfo}
                symbol={symbol}
                statusFilter={filters.statusFilter}
                onStatusFilterChange={filters.setStatusFilter}
                rewardMin={filters.rewardMin}
                onRewardMinChange={filters.setRewardMin}
                rewardMax={filters.rewardMax}
                onRewardMaxChange={filters.setRewardMax}
                onClearRewardRange={() => {
                  filters.setRewardMin("")
                  filters.setRewardMax("")
                }}
                preset={filters.preset}
                onPresetChange={filters.setPreset}
              />

              <QuestList
                quests={filters.visibleQuests}
                totalCount={filters.sortedQuests.length}
                questStats={questStats}
                questCompletions={questCompletions}
                address={address}
                isLoading={isLoading}
                statsLoading={questStatsLoading}
                loadError={loadError}
                hasMorePublic={hasMorePublic}
                loadingMore={loadingMore}
                onRetry={() => void refetch()}
                onLoadMore={loadMore}
                onOpenQuest={goToQuest}
                onCreateQuest={goToCreateQuest}
                filter={filters.filter}
                preset={filters.preset}
                category={filters.category}
                searchQuery={filters.searchQuery}
              />
            </div>
          </SectionErrorBoundary>
        </div>

        {/* Right Column (Trending & Recent Activity) */}
        <div className="animate-fade-in-up stagger-3 space-y-8">
          <SectionErrorBoundary label="Trending quests">
            <TrendingQuests
              quests={trendingQuests}
              statsByQuest={questStats}
              onSelectQuest={goToQuest}
            />
          </SectionErrorBoundary>
          <SectionErrorBoundary label="Recent activity">
            <RecentActivity activities={recentActivity} />
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  )
}
