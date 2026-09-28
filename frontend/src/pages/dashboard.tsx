import React, { useState, useEffect, useCallback, Suspense } from "react"
import React, { useState, useDeferredValue, useEffect, useCallback, Suspense } from "react"
import {
  Plus,
  Users,
  Target,
  Coins,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Loader2,
  Search,
  X,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VirtualList } from "@/components/ui/virtual-list"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PrefetchLink } from "@/components/PrefetchLink"
import { useContractData } from "@/hooks/use-async-data"
import { EmptyState } from "@/components/ui/async-states"
import { SkeletonQuestList } from "@/components/ui/skeleton"
import { SmartError } from "@/components/error-states"
import { SectionErrorBoundary } from "@/components/error-boundary"
import { useWallet } from "@/hooks/use-wallet"
import { logger } from "@/lib/logger"
import { questClient } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"
import type { QuestInfo, CategoryInfo } from "@/lib/contract-types"
import { useQuestStatsMap } from "@/hooks/use-quest-stats"
import { prefetchQuestData } from "@/hooks/use-quest-data"
import { queryClient } from "@/lib/query-client"
import { useTokenSymbol } from "@/hooks/use-token-symbol"
import { useNowSeconds } from "@/hooks/use-now"
import { formatTokens, getQuestLifecycleStatus } from "@/lib/utils"
import { navigateToPath } from "@/lib/navigation"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useTranslation } from "@/i18n"

// Sub-components
import { PersonalProgress } from "./dashboard/personal-progress"
import { TrendingQuests } from "./dashboard/trending-quests"
import { RecentActivity } from "./dashboard/recent-activity"

// Lazy-loaded chart
const EarningsChart = React.lazy(() => import("./dashboard/earnings-chart"))
const DASHBOARD_QUEST_PAGE_SIZE = 20
const DASHBOARD_LOAD_MORE_SIZE = 20
/** Above this many quest cards the grid switches to windowed rendering. */
const DASHBOARD_VIRTUALIZE_THRESHOLD = 24
const TRENDING_QUEST_LIMIT = 2
const RECENT_ACTIVITY_LIMIT = 5

type QuestDiscoveryStatus = "all" | "active" | "completed"

interface DashboardProps {
  onSelectQuest?: (id: number) => void
  onCreateQuest?: () => void
  /** Optional callback to open the onboarding tutorial */
  onLaunchTutorial?: () => void
}

export function Dashboard({ onSelectQuest, onCreateQuest, onLaunchTutorial }: DashboardProps = {} as DashboardProps) {
  const { connected, connect, shortAddress, address, loading: walletConnecting, error } = useWallet()
export function Dashboard(
  { onSelectQuest, onCreateQuest, onLaunchTutorial }: DashboardProps = {} as DashboardProps
) {
  const { t } = useTranslation()
  const { symbol } = useTokenSymbol()
  const { connected, connect, shortAddress, address } = useWallet()
  const [filter, setFilter] = useState<"all" | "owned" | "enrolled">("all")
  const [preset, setPreset] = useState<
    "none" | "ending-soon" | "recently-funded" | "recently-verified"
  >("none")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [creatorFilter, setCreatorFilter] = useState("all")
  const [rewardTokenFilter, setRewardTokenFilter] = useState("all")
  const [sortBy, setSortBy] = useState<
    "newest" | "ending-soon" | "most-enrolled" | "highest-reward"
  >("newest")
  const [statusFilter, setStatusFilter] = useState<QuestDiscoveryStatus>("all")
  const [rewardMin, setRewardMin] = useState<string>("")
  const [rewardMax, setRewardMax] = useState<string>("")
  const deferredSearch = useDeferredValue(search)
  const deferredRewardMin = useDeferredValue(rewardMin)
  const deferredRewardMax = useDeferredValue(rewardMax)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<"AND" | "OR">("OR")
  const [tagInput, setTagInput] = useState("")
  const [displayCount, setDisplayCount] = useState(DASHBOARD_QUEST_PAGE_SIZE)
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000))
  // Live clock: deadline filters and derived lifecycle status must reflect the
  // real time, not the value sampled on first render — a tab left open in the
  // background used to keep showing quests as "ending soon" long after their
  // deadline passed (issue #1335). A minute is enough granularity here and
  // keeps the (potentially long) quest list from re-rendering more often.
  const nowSeconds = useNowSeconds(60_000)

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

  useEffect(() => {
    if (category === "all" || !questClient.getCategory) {
      setCategoryInfo(null)
      return
    }
    let active = true
    questClient
      .getCategory(category)
      .then(info => {
        if (active) setCategoryInfo(info)
      })
      .catch(() => {
        if (active) setCategoryInfo(null)
      })
    return () => {
      active = false
    }
  }, [category])
  

  const onboarding = useOnboarding()

  // Dashboard data stays refetchable so error-state retry can reload the full view.
  const {
    data: dashboardData,
    isLoading,
    error: loadError,
    refetch,
  } = useContractData(
    "dashboard",
    async () => {
      const publicQuests = await questClient.listPublicQuests(0, DASHBOARD_QUEST_PAGE_SIZE)
      const [ownedQuests, enrolledQuests] = address
        ? await Promise.all([
            questClient.listQuestsByOwner(address),
            questClient.listQuestsByEnrollee(address),
          ])
        : [[], []]

      const allQuests = [...publicQuests, ...ownedQuests, ...enrolledQuests]
      if (allQuests.length === 0) {
        logger.warn("[Dashboard] No quests loaded from any source")
      }

      const questMap = new Map(allQuests.map(quest => [quest.id, quest] as const))

      if (questMap.size < allQuests.length) {
        logger.warn(`[Dashboard] Deduplication lost ${allQuests.length - questMap.size} quest(s)`, {
          before: allQuests.length,
          after: questMap.size,
        })
      }

      const accessibleQuests = Array.from(questMap.values())

      const previewAllQuests = [
        ...publicQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
        ...ownedQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
        ...enrolledQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
      ]

      if (previewAllQuests.length === 0) {
        logger.warn("[Dashboard] No preview quests loaded from any source")
      }

      const previewQuestMap = new Map(previewAllQuests.map(quest => [quest.id, quest] as const))

      if (previewQuestMap.size < previewAllQuests.length) {
        logger.warn(
          `[Dashboard] Preview deduplication lost ${previewAllQuests.length - previewQuestMap.size} quest(s)`,
          { before: previewAllQuests.length, after: previewQuestMap.size }
        )
      }

      const previewQuests = Array.from(previewQuestMap.values())

      let questCompletions: Record<number, number> = {}
      let userEarnings = 0n
      if (address) {
        const [completionEntries, earnings] = await Promise.all([
          Promise.all(
            previewQuests.map(async q => {
              const completed = await milestoneClient.getEnrolleeCompletions(q.id, address)
              return [q.id, completed] as const
            })
          ),
          rewardsClient.getUserEarnings(address),
        ])
        questCompletions = Object.fromEntries(completionEntries)
        userEarnings = earnings
      }

      return {
        publicQuests,
        ownedQuests,
        enrolledQuests,
        accessibleQuests,
        previewQuestIds: previewQuests.map(q => q.id),
        questCompletions,
        userEarnings,
      }
    },
    {
      enabled: connected,
      queryKey: [connected, address],
    }
  )

  // Extract data or use defaults
  const {
    publicQuests = [],
    ownedQuests = [],
    enrolledQuests = [],
    accessibleQuests = [],
    previewQuestIds = [],
    questCompletions = {},
    userEarnings = 0n,
  } = dashboardData || {}

  const { statsByQuestId: questStats, isLoading: questStatsLoading } =
    useQuestStatsMap(previewQuestIds)

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

  const loadedPublicQuests = [...publicQuests, ...extraPublicQuests]

  const filteredQuests =
    filter === "owned"
      ? ownedQuests
      : filter === "enrolled"
        ? enrolledQuests
        : loadedPublicQuests
    filter === "owned" ? ownedQuests : filter === "enrolled" ? enrolledQuests : loadedPublicQuests

  const presetFilteredQuests = (() => {
    if (preset === "ending-soon") {
      const sevenDaysFromNow = nowSeconds + 7 * 24 * 60 * 60
      return filteredQuests.filter(
        q => q.deadline > 0 && q.deadline > nowSeconds && q.deadline <= sevenDaysFromNow
      )
    }
    if (preset === "recently-funded") {
      const thirtyDaysAgo = nowSeconds - 30 * 24 * 60 * 60
      return filteredQuests.filter(q => q.createdAt >= thirtyDaysAgo)
    }
    if (preset === "recently-verified") {
      return filteredQuests.filter(q => q.verified)
    }
    return filteredQuests
  })()

  const availableCategories = Array.from(
    new Set(filteredQuests.map(q => q.category).filter((c): c is string => !!c))
  ).sort()
  const availableCreators = Array.from(new Set(filteredQuests.map(q => q.owner))).sort()
  const availableRewardTokens = Array.from(new Set(filteredQuests.map(q => q.tokenAddr))).sort()

  // Derive quest status from on-chain state via the single shared
  // lifecycle-status function (see lib/utils.ts's getQuestLifecycleStatus doc
  // comment) instead of reimplementing the active/expired/archived/cancelled
  // logic locally with its own edge cases.
  function deriveQuestStatus(q: { status: number; deadline: number }): QuestDiscoveryStatus {
    const lifecycle = getQuestLifecycleStatus({
      status: q.status as QuestInfo["status"],
      deadline: q.deadline,
    })
    return lifecycle === "active" ? "active" : "completed"
  }

  const statusFilteredQuests =
    statusFilter === "all"
      ? presetFilteredQuests
      : presetFilteredQuests.filter(q => deriveQuestStatus(q) === statusFilter)

  const categoryFilteredQuests =
    category === "all"
      ? statusFilteredQuests
      : statusFilteredQuests.filter(q => q.category === category)

  const creatorFilteredQuests =
    creatorFilter === "all"
      ? categoryFilteredQuests
      : categoryFilteredQuests.filter(q => q.owner === creatorFilter)

  const tokenFilteredQuests =
    rewardTokenFilter === "all"
      ? creatorFilteredQuests
      : creatorFilteredQuests.filter(q => q.tokenAddr === rewardTokenFilter)

  // Reward range filter (uses deferred values to avoid re-rendering on every keystroke)
  const rewardMinNum = deferredRewardMin !== "" ? Number(deferredRewardMin) : 0
  const rewardMaxNum = deferredRewardMax !== "" ? Number(deferredRewardMax) : Infinity
  const rewardFilteredQuests = tokenFilteredQuests.filter(q => {
    const stats = questStats[q.id]
    const pool = stats?.poolBalance ?? 0
    const poolDisplay = pool / 10 ** 7
    if (deferredRewardMin !== "" && poolDisplay < rewardMinNum) return false
    if (deferredRewardMax !== "" && poolDisplay > rewardMaxNum) return false
    return true
  })

  const searchQuery = deferredSearch.trim().toLowerCase()
  const searchedQuests = searchQuery
    ? rewardFilteredQuests.filter(q => {
        const haystack = [q.name, q.description, q.category, ...(q.tags ?? [])]
          .join(" ")
          .toLowerCase()
        return haystack.includes(searchQuery)
      })
    : rewardFilteredQuests

  // Tag filter — multi-tag AND/OR (issue #1635)
  const allKnownTags = Array.from(new Set(filteredQuests.flatMap(q => q.tags ?? []))).sort()
  const tagSuggestions = tagInput.trim()
    ? allKnownTags.filter(
        tag =>
          tag.toLowerCase().includes(tagInput.trim().toLowerCase()) && !selectedTags.includes(tag)
      )
    : []
  const tagFilteredQuests =
    selectedTags.length === 0
      ? searchedQuests
      : searchedQuests.filter(q => {
          const qtags = q.tags ?? []
          return tagFilterMode === "AND"
            ? selectedTags.every(tag => qtags.includes(tag))
            : selectedTags.some(tag => qtags.includes(tag))
        })

  const sortedQuests = [...tagFilteredQuests].sort((a, b) => {
    const statsA = questStats[a.id]
    const statsB = questStats[b.id]

    switch (sortBy) {
      case "ending-soon": {
        const deadlineA = a.deadline > 0 ? a.deadline : Infinity
        const deadlineB = b.deadline > 0 ? b.deadline : Infinity
        return deadlineA - deadlineB
      }
      case "most-enrolled":
        return (statsB?.enrolleeCount ?? 0) - (statsA?.enrolleeCount ?? 0)
      case "highest-reward":
        return (statsB?.poolBalance ?? 0) - (statsA?.poolBalance ?? 0)
      case "newest":
      default:
        return b.createdAt - a.createdAt
    }
  })

  const visibleQuests = sortedQuests.slice(0, displayCount)

  const ownedCount = ownedQuests.length
  const enrolledCount = enrolledQuests.length
  const milestonesCompleted = (Object.values(questCompletions) as number[]).reduce(
    (sum: number, count: number) => sum + count,
    0
  )

  const userEarningsBigInt =
    typeof userEarnings === "bigint" ? userEarnings : BigInt(userEarnings || 0)
  const personalStats = {
    totalEarned: userEarningsBigInt,
    questsOwned: ownedCount,
    questsEnrolled: enrolledCount,
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

  const renderQuestCard = (ws: (typeof visibleQuests)[number], i: number) => {
    const stats = questStats[ws.id] || {
      enrolleeCount: 0,
      milestoneCount: 0,
      poolBalance: 0,
    }
    const totalMilestones = stats.milestoneCount
    // Treat missing/null completion as unknown — never coerce to 0% which
    // looks like "started but empty". See #1331.
    const completedCount = questCompletions[ws.id]
    const hasCompletion = typeof completedCount === "number" && Number.isFinite(completedCount)
    const startedCount = hasCompletion ? completedCount : 0
    const notStarted = !hasCompletion || startedCount === 0
    const totalReward = stats.poolBalance
    const earnedReward =
      totalMilestones > 0 && hasCompletion ? (totalReward * startedCount) / totalMilestones : 0
    const isOwned = !!address && ws.owner === address

    return (
      <button
        key={ws.id}
        type="button"
        onClick={() => goToQuest(ws.id)}
        onMouseEnter={() => void prefetchQuestData(queryClient, ws.id)}
        onFocus={() => void prefetchQuestData(queryClient, ws.id)}
        aria-label={`Open quest ${ws.name}`}
        data-onboarding={i === 0 ? "quest-card" : undefined}
        className={`card-tilt group animate-fade-in-up cursor-pointer stagger-${i + 1} focus-visible:ring-ring w-full text-left focus-visible:ring-2 focus-visible:outline-none`}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <CardTitle className="group-hover:text-accent text-base transition-colors">
                    {ws.name}
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
                <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">{ws.description}</p>
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
                {ws.maxEnrollees ? (
                  <>
                    {stats.enrolleeCount}/{ws.maxEnrollees} enrolled (
                    {Math.max(0, ws.maxEnrollees - stats.enrolleeCount)} left)
                  </>
                ) : (
                  <>{stats.enrolleeCount} enrolled</>
                )}
              </Button>

              {error && (
                <div
                  role="alert"
                  className="border-border bg-destructive/10 mb-6 border px-4 py-3 text-left text-sm font-semibold text-destructive"
                >
                  {error.message}
                </div>
              )}

              {/* Mini feature list */}
              <div className="border-border animate-fade-in-up stagger-4 mt-8 border-t pt-6">
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Target, text: "Track quests" },
                    { icon: Coins, text: "Earn tokens" },
                    { icon: Sparkles, text: "On-chain" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2">
                      <div className="bg-secondary border-border flex h-6 w-6 items-center justify-center border-[1.5px]">
                        <item.icon className="h-3 w-3" />
                      </div>
                      <span className="text-muted-foreground text-xs font-bold">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
                {ws.maxEnrollees
                  ? t("quest.enrolledOfMax", {
                      count: stats.enrolleeCount,
                      max: ws.maxEnrollees,
                      left: Math.max(0, ws.maxEnrollees - stats.enrolleeCount),
                    })
                  : t("common.enrolled", { count: stats.enrolleeCount })}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Target className="h-3 w-3" />
                {t("common.milestones", { count: stats.milestoneCount })}
              </Badge>
              <Badge variant="default" className="gap-1">
                <Coins className="h-3 w-3" />
                {formatTokens(stats.poolBalance, 7, symbol)}
              </Badge>
              {ws.category && (
                <Badge variant="outline" className="text-[10px]">
                  {ws.category}
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
              </Button>

              {error && (
                <div
                  role="alert"
                  className="border-border bg-destructive/10 mb-6 border px-4 py-3 text-left text-sm font-semibold text-destructive"
                >
                  {error.message}
                </div>
              )}

              {/* Mini feature list */}
              <div className="border-border animate-fade-in-up stagger-4 mt-8 border-t pt-6">
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Target, text: "Track quests" },
                    { icon: Coins, text: "Earn tokens" },
                    { icon: Sparkles, text: "On-chain" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2">
                      <div className="bg-secondary border-border flex h-6 w-6 items-center justify-center border-[1.5px]">
                        <item.icon className="h-3 w-3" />
                      </div>
                      <span className="text-muted-foreground text-xs font-bold">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </button>
    )
  }

  // We group all return elements into a single return with one parent div to avoid JSX parsing ambiguity
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Getting Started Banner for new users */}
      {!onboarding?.completed && (
        <div className="bg-primary text-primary-foreground mb-8 flex flex-col items-center justify-between p-6 shadow-lg sm:flex-row">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5" /> {t("dashboard.getStarted")}
            </h2>
            <p className="text-primary-foreground/80 mt-1">{t("dashboard.getStartedBody")}</p>
          </div>
          <div className="mt-4 flex gap-3 sm:mt-0">
            <Button
              variant="secondary"
              onClick={() => onboarding?.open?.(0)}
              className="font-bold"
              aria-label={t("dashboard.startLearnerTour")}
            >
              {t("dashboard.learnerTour")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onboarding?.open?.(5)}
              className="border-primary-foreground hover:bg-primary-foreground/10 text-primary-foreground bg-transparent"
              aria-label={t("dashboard.startCreatorTour")}
            >
              {t("dashboard.creatorTour")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onboarding?.complete?.()}
              className="hover:bg-primary-foreground/10 text-primary-foreground"
              aria-label={t("dashboard.dismissBanner")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Welcome banner */}
      <div className="bg-accent border-border animate-fade-in-up relative mb-8 overflow-hidden border p-6 shadow-lg sm:p-8">
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-bold tracking-wider uppercase">
                {connected ? t("dashboard.welcomeBack") : t("dashboard.welcome")}
              </span>
            </div>
            {connected ? (
              <PrefetchLink to={`/creator/${address}`}>
                <h1 className="hover:text-background/80 text-3xl font-semibold transition-colors sm:text-4xl">
                  {shortAddress}
                </h1>
              </PrefetchLink>
            ) : (
              <h1 className="text-3xl font-semibold sm:text-4xl">
                {t("dashboard.discoverQuests")}
              </h1>
            )}
            <p className="mt-1 text-sm font-bold opacity-70">
              {connected
                ? t("dashboard.activeQuests", { count: personalStats.questsEnrolled })
                : t("dashboard.explorePaths")}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={goToCreateQuest}
            className="shimmer-on-hover group flex-shrink-0"
            data-onboarding="nav-create-quest"
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.createQuest")}
          </Button>
          {onLaunchTutorial && (
            <Button
              variant="outline"
              onClick={onLaunchTutorial}
              data-onboarding="tutorial-button"
              className="flex flex-shrink-0 items-center gap-2"
              aria-label={t("nav.openTutorial")}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.takeTour")}
            </Button>
          )}
        </div>
      </div>

      {/* Platform Stats Overview removed as requested */}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Personal Stats, Chart, Quests) */}
        <div className="animate-fade-in-up stagger-2 space-y-8 lg:col-span-2">
          {/* Personal Stats */}
          {connected && (
            <>
              <SectionErrorBoundary label="Personal stats">
                <PersonalProgress stats={personalStats} />
              </SectionErrorBoundary>

              {/* Earnings Chart (Lazy Loaded) */}
              <SectionErrorBoundary label="Earnings chart">
                <Suspense
                  fallback={
                    <div className="bg-muted border-border h-[250px] animate-pulse border shadow-lg" />
                  }
                >
                  <EarningsChart data={earningsHistory} capped={earningsChartCapped} />
                </Suspense>
              </SectionErrorBoundary>
            </>
          )}

          {/* Your Quests Section */}
          <SectionErrorBoundary label="Your quests">
            <div>
              <div className="relative mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <LayoutDashboard className="h-5 w-5" />{" "}
                  {connected ? t("dashboard.yourQuests") : t("dashboard.publicQuests")}
                </h2>
                {connected && (
                  <div
                    className="border-border flex gap-0 border shadow-md"
                    role="group"
                    aria-label={t("dashboard.questFilter")}
                  >
                    {(["all", "owned", "enrolled"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        aria-pressed={filter === f}
                        className={`border-border cursor-pointer border-r px-4 py-2 text-xs font-semibold tracking-wider capitalize uppercase transition-colors last:border-r-0 ${
                          filter === f ? "bg-accent" : "bg-background hover:bg-secondary"
                        }`}
                      >
                        {f === "all"
                          ? t("dashboard.showAll")
                          : f === "owned"
                            ? t("dashboard.showOwned")
                            : t("dashboard.showEnrolled")}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search, category filter, and sort */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("dashboard.searchPlaceholder")}
                    aria-label={t("dashboard.searchLabel")}
                    className="border-border bg-background w-full border py-2.5 pr-9 pl-9 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label={t("dashboard.clearSearch")}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  aria-label={t("dashboard.filterCategory")}
                  className="border-border bg-background cursor-pointer border px-3 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-sm focus:outline-none"
                >
                  <option value="all">{t("dashboard.allCategories")}</option>
                  {availableCategories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={creatorFilter}
                  onChange={e => setCreatorFilter(e.target.value)}
                  aria-label={t("dashboard.filterCreator")}
                  className="border-border bg-background cursor-pointer border px-3 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-sm focus:outline-none"
                >
                  <option value="all">{t("dashboard.allCreators")}</option>
                  {availableCreators.map(creator => (
                    <option key={creator} value={creator}>
                      {creator === address
                        ? t("dashboard.you")
                        : `${creator.slice(0, 6)}...${creator.slice(-4)}`}
                    </option>
                  ))}
                </select>

                <select
                  value={rewardTokenFilter}
                  onChange={e => setRewardTokenFilter(e.target.value)}
                  aria-label={t("dashboard.filterToken")}
                  className="border-border bg-background cursor-pointer border px-3 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-sm focus:outline-none"
                >
                  <option value="all">{t("dashboard.allTokens")}</option>
                  {availableRewardTokens.map(token => (
                    <option key={token} value={token}>
                      {`${token.slice(0, 6)}...${token.slice(-4)}`}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  aria-label={t("dashboard.sortQuests")}
                  className="border-border bg-background cursor-pointer border px-3 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-sm focus:outline-none"
                >
                  <option value="newest">{t("dashboard.sort.newest")}</option>
                  <option value="ending-soon">{t("dashboard.sort.endingSoon")}</option>
                  <option value="most-enrolled">{t("dashboard.sort.mostEnrolled")}</option>
                  <option value="highest-reward">{t("dashboard.sort.highestReward")}</option>
                </select>
              </div>

              {/* Tag search with autocomplete (issue #1635) */}
              <div className="mb-4">
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                          e.preventDefault()
                          const tag = tagInput.trim().replace(/,$/, "")
                          if (tag && !selectedTags.includes(tag)) {
                            setSelectedTags(prev => [...prev, tag])
                          }
                          setTagInput("")
                        }
                      }}
                      placeholder={t("dashboard.tagFilterPlaceholder")}
                      aria-label={t("dashboard.tagFilterLabel")}
                      aria-autocomplete="list"
                      aria-controls="tag-suggestions"
                      className="border-border bg-background w-full border py-2 pr-3 pl-3 text-sm font-medium focus:outline-none"
                    />
                    {tagSuggestions.length > 0 && (
                      <ul
                        id="tag-suggestions"
                        role="listbox"
                        aria-label={t("dashboard.tagSuggestions")}
                        className="border-border bg-background absolute top-full left-0 z-20 mt-0.5 w-full border shadow-lg"
                      >
                        {tagSuggestions.slice(0, 8).map(tag => (
                          <li key={tag} role="option" aria-selected={false}>
                            <button
                              type="button"
                              className="hover:bg-accent w-full px-3 py-1.5 text-left text-xs font-medium"
                              onMouseDown={e => {
                                e.preventDefault()
                                setSelectedTags(prev => [...prev, tag])
                                setTagInput("")
                              }}
                            >
                              {tag}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* AND / OR toggle */}
                  {selectedTags.length > 1 && (
                    <div
                      className="border-border flex border shadow-sm"
                      role="group"
                      aria-label={t("dashboard.tagFilterMode")}
                    >
                      {(["OR", "AND"] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setTagFilterMode(m)}
                          aria-pressed={tagFilterMode === m}
                          className={`px-3 py-2 text-xs font-bold transition-colors ${
                            tagFilterMode === m ? "bg-accent" : "bg-background hover:bg-secondary"
                          }`}
                        >
                          {m === "OR" ? t("dashboard.tagModeOr") : t("dashboard.tagModeAnd")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Active tag chips */}
                {selectedTags.length > 0 && (
                  <div
                    className="mt-2 flex flex-wrap gap-1.5"
                    aria-label={t("dashboard.activeTagFilters")}
                  >
                    {selectedTags.map(tag => (
                      <span
                        key={tag}
                        className="bg-accent border-border flex items-center gap-1 border px-2 py-0.5 text-xs font-bold"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setSelectedTags(prev => prev.filter(x => x !== tag))}
                          aria-label={t("create.removeTag", { tag })}
                          className="hover:text-destructive ml-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedTags([])}
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                    >
                      {t("dashboard.clearAllTags")}
                    </button>
                  </div>
                )}
              </div>

              {categoryInfo && (
                <p
                  className={`text-xs font-bold ${
                    categoryInfo.expiresAt * 1000 - Date.now() < 7 * 24 * 60 * 60 * 1000
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {categoryInfo.expiresAt * 1000 - Date.now() < 7 * 24 * 60 * 60 * 1000
                    ? "Expiring soon — "
                    : "Available until "}
                    ? t("dashboard.expiringSoon")
                    : t("dashboard.availableUntil")}
                  {new Date(categoryInfo.expiresAt * 1000).toLocaleDateString()}
                </p>
              )}

              {/* Status filter chips */}
              <div
                className="mb-4 flex flex-wrap gap-2"
                role="group"
                aria-label={t("dashboard.filterStatus")}
              >
                {(
                  [
                    { value: "all", label: t("dashboard.status.all") },
                    { value: "active", label: t("dashboard.status.active") },
                    { value: "completed", label: t("dashboard.status.completed") },
                  ] as const
                ).map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value)}
                    aria-pressed={statusFilter === s.value}
                    className={`border-border border px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
                      statusFilter === s.value
                        ? "bg-accent"
                        : "bg-background hover:bg-secondary hover:shadow-md"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Reward range filter */}
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground text-xs font-bold uppercase">
                    {t("dashboard.rewardRange")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={rewardMin}
                    onChange={e => setRewardMin(e.target.value)}
                    placeholder={t("dashboard.minReward", { symbol })}
                    aria-label={t("dashboard.minRewardLabel")}
                    min="0"
                    className="border-border bg-background w-28 border px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none"
                  />
                  <span className="text-muted-foreground text-xs">-</span>
                  <input
                    type="number"
                    value={rewardMax}
                    onChange={e => setRewardMax(e.target.value)}
                    placeholder={t("dashboard.maxReward", { symbol })}
                    aria-label={t("dashboard.maxRewardLabel")}
                    min="0"
                    className="border-border bg-background w-28 border px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none"
                  />
                  {(rewardMin !== "" || rewardMax !== "") && (
                    <button
                      type="button"
                      onClick={() => {
                        setRewardMin("")
                        setRewardMax("")
                      }}
                      aria-label={t("dashboard.clearRewardRange")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Filter Chips */}
              <div
                className="mb-5 flex flex-wrap gap-2"
                role="group"
                aria-label={t("dashboard.presetFilters")}
              >
                {(
                  [
                    { value: "none", label: t("dashboard.showAll") },
                    { value: "ending-soon", label: t("dashboard.preset.endingSoon") },
                    { value: "recently-funded", label: t("dashboard.preset.recentlyFunded") },
                    { value: "recently-verified", label: t("dashboard.preset.recentlyVerified") },
                  ] as const
                ).map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPreset(p.value)}
                    aria-pressed={preset === p.value}
                    className={`border-border border px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
                      preset === p.value
                        ? "bg-accent"
                        : "bg-background hover:bg-secondary hover:shadow-md"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {loadError && (
                <div className="mb-5">
                  <SmartError message={loadError} onRetry={() => void refetch()} />
                </div>
              )}

              {(isLoading || questStatsLoading) && <SkeletonQuestList className="mb-5" count={3} />}

              <div className="relative grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-1">
                {visibleQuests.map((ws, i) => {
                  const stats = questStats[ws.id] || {
                    enrolleeCount: 0,
                    milestoneCount: 0,
                    poolBalance: 0,
                  }
                  const totalMilestones = stats.milestoneCount
                  const completedCount = questCompletions[ws.id] || 0
                  const totalReward = stats.poolBalance
                  const earnedReward =
                    totalMilestones > 0 ? (totalReward * completedCount) / totalMilestones : 0
                  const isOwned = !!address && ws.owner === address

                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => goToQuest(ws.id)}
                      aria-label={`Open quest ${ws.name}`}
                      data-onboarding={i === 0 ? "quest-card" : undefined}
                      className={`card-tilt group animate-fade-in-up cursor-pointer stagger-${i + 1} focus-visible:ring-ring w-full text-left focus-visible:ring-2 focus-visible:outline-none`}
                    >
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-3">
                                <CardTitle className="group-hover:text-accent text-base transition-colors">
                                  {ws.name}
                                </CardTitle>
                                {completedCount === totalMilestones && totalMilestones > 0 && (
                                  <Badge variant="success" className="gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Complete
                                  </Badge>
                                )}
                                <Badge
                                  variant={isOwned ? "default" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {isOwned ? "Owner" : "Enrolled"}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                                {ws.description}
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
                              {ws.maxEnrollees ? (
                                <>
                                  {stats.enrolleeCount}/{ws.maxEnrollees} enrolled (
                                  {Math.max(0, ws.maxEnrollees - stats.enrolleeCount)} left)
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
                            {ws.category && (
                              <Badge variant="outline" className="text-[10px]">
                                {ws.category}
                              </Badge>
                            )}
                          </div>

                          {totalMilestones > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <Progress
                                  value={completedCount}
                                  max={totalMilestones}
                                  className="flex-1"
                                />
                                <span className="text-muted-foreground text-xs font-bold whitespace-nowrap">
                                  {completedCount}/{totalMilestones}
                                </span>
                              </div>
                              {earnedReward > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground text-xs font-bold">
                                    Earned so far
                                  </span>
                                  <span className="text-xs font-semibold text-green-700">
                                    +{formatTokens(earnedReward)} / {formatTokens(totalReward)} USDC
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </button>
                  )
                })}
              </div>

              {(hasMorePublic || sortedQuests.length > visibleQuests.length) &&
                !isLoading &&
                !loadError && (
                  <div className="mt-5 text-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDisplayCount(prev => prev + DASHBOARD_LOAD_MORE_SIZE)
                        if (hasMorePublic) void loadMorePublic()
                      }}
                      className="shimmer-on-hover"
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </>
                      ) : (
                        `Load more (${visibleQuests.length} of ${sortedQuests.length})`
                      )}
                    </Button>
                  </div>
                )}
              {visibleQuests.length > DASHBOARD_VIRTUALIZE_THRESHOLD ? (
                <VirtualList
                  items={visibleQuests}
                  getKey={ws => String(ws.id)}
                  height={720}
                  itemClassName="pb-4 pb-5"
                  renderItem={renderQuestCard}
                />
              ) : (
                <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {visibleQuests.map(renderQuestCard)}
                </div>
              )}

              {(hasMorePublic || sortedQuests.length > visibleQuests.length) &&
                !isLoading &&
                !loadError && (
                  <div className="mt-5 text-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDisplayCount(prev => prev + DASHBOARD_LOAD_MORE_SIZE)
                        if (hasMorePublic) void loadMorePublic()
                      }}
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
                          visible: visibleQuests.length,
                          total: sortedQuests.length,
                        })
                      )}
                    </Button>
                  </div>
                )}

              {sortedQuests.length === 0 && !isLoading && !loadError && (
                <div className="mt-5">
                  <EmptyState
                    variant="default"
                    illustration="dashboard"
                    title={
                      searchQuery || category !== "all"
                        ? t("dashboard.noMatch")
                        : preset !== "none"
                          ? t("dashboard.noFilteredQuests", { filter: preset.replace("-", " ") })
                          : filter === "all"
                            ? t("dashboard.noQuestsYet")
                            : t("dashboard.noFilteredQuests", { filter })
                    }
                    description={
                      searchQuery || category !== "all"
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
                            onClick: goToCreateQuest,
                          }
                        : undefined
                    }
                  />
                </div>
              )}
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
