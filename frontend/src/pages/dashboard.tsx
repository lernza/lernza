import React, { useState, Suspense } from "react"
import {
  Plus,
  Users,
  Target,
  Coins,
  ChevronRight,
  Wallet,
  Sparkles,
  LayoutDashboard,
  Loader2,
  Search,
  X,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PrefetchLink } from "@/components/PrefetchLink"
import { useContractData } from "@/hooks/use-async-data"
import { EmptyState } from "@/components/ui/async-states"
import { SkeletonQuestList } from "@/components/ui/skeleton"
import { SmartError } from "@/components/error-states"
import { SectionErrorBoundary } from "@/components/error-boundary"
import { useWallet } from "@/hooks/use-wallet"
import { questClient } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"
import { useQuestStatsMap } from "@/hooks/use-quest-stats"
import { formatTokens } from "@/lib/utils"
import { navigateToPath } from "@/lib/navigation"

// Sub-components
import { PersonalProgress } from "./dashboard/personal-progress"
import { TrendingQuests } from "./dashboard/trending-quests"
import { RecentActivity } from "./dashboard/recent-activity"

// Lazy-loaded chart
const EarningsChart = React.lazy(() => import("./dashboard/earnings-chart"))
const DASHBOARD_QUEST_PAGE_SIZE = 12
const TRENDING_QUEST_LIMIT = 2
const RECENT_ACTIVITY_LIMIT = 5

interface DashboardProps {
  onSelectQuest?: (id: number) => void
  onCreateQuest?: () => void
  /** Optional callback to open the onboarding tutorial */
  onLaunchTutorial?: () => void
}

export function Dashboard({ onSelectQuest, onCreateQuest, onLaunchTutorial }: DashboardProps = {} as DashboardProps) {
  const { connected, connect, shortAddress, address, loading: walletConnecting } = useWallet()
  const [filter, setFilter] = useState<"all" | "owned" | "enrolled">("all")
  const [preset, setPreset] = useState<
    "none" | "ending-soon" | "recently-funded" | "recently-verified"
  >("none")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState<
    "newest" | "ending-soon" | "most-enrolled" | "highest-reward"
  >("newest")
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000))

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
        console.warn("[Dashboard] No quests loaded from any source")
      }

      const questMap = new Map(allQuests.map(quest => [quest.id, quest] as const))

      if (questMap.size < allQuests.length) {
        console.warn(
          `[Dashboard] Deduplication lost ${allQuests.length - questMap.size} quest(s)`,
          { before: allQuests.length, after: questMap.size }
        )
      }

      const accessibleQuests = Array.from(questMap.values())

      const previewAllQuests = [
        ...publicQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
        ...ownedQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
        ...enrolledQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE),
      ]

      if (previewAllQuests.length === 0) {
        console.warn("[Dashboard] No preview quests loaded from any source")
      }

      const previewQuestMap = new Map(
        previewAllQuests.map(quest => [quest.id, quest] as const)
      )

      if (previewQuestMap.size < previewAllQuests.length) {
        console.warn(
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

  const goToQuest = (id: number) => {
    if (onSelectQuest) {
      onSelectQuest(id)
      return
    }
    navigateToPath(`/quest/${id}`)
  }

  const goToCreateQuest = () => {
    if (onCreateQuest) {
      onCreateQuest()
      return
    }
    navigateToPath("/create-quest")
  }

  const filteredQuests =
    filter === "owned" ? ownedQuests : filter === "enrolled" ? enrolledQuests : publicQuests

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

  const categoryFilteredQuests =
    category === "all"
      ? presetFilteredQuests
      : presetFilteredQuests.filter(q => q.category === category)

  const searchQuery = search.trim().toLowerCase()
  const searchedQuests = searchQuery
    ? categoryFilteredQuests.filter(q => {
        const haystack = [q.name, q.description, q.category, ...(q.tags ?? [])]
          .join(" ")
          .toLowerCase()
        return haystack.includes(searchQuery)
      })
    : categoryFilteredQuests

  const sortedQuests = [...searchedQuests].sort((a, b) => {
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

  const visibleQuests = sortedQuests.slice(0, DASHBOARD_QUEST_PAGE_SIZE)

  const ownedCount = ownedQuests.length
  const enrolledCount = enrolledQuests.length
  const milestonesCompleted = (Object.values(questCompletions) as number[]).reduce(
    (sum: number, count: number) => sum + count,
    0
  )

  const personalStats = {
    totalEarned: Number(userEarnings),
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
  const earningsHistory = [
    { date: "Start", amount: 0 },
    { date: currentMonth, amount: Number(userEarnings) },
  ]

  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        {/* Background elements */}
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div
          className="bg-accent border-border animate-float absolute top-[10%] left-[8%] h-20 w-20 rotate-12 border opacity-[0.08] shadow-md"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="bg-accent border-border animate-float absolute right-[6%] bottom-[15%] h-14 w-14 -rotate-6 border opacity-[0.1] shadow-md"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
        <div
          className="bg-success border-border animate-float absolute top-[60%] left-[5%] h-10 w-10 rotate-45 border opacity-[0.06] shadow-sm"
          style={{ animationDuration: "7s", animationDelay: "2s" }}
        />
        <div
          className="bg-accent border-border animate-float absolute top-[20%] right-[12%] h-8 w-8 -rotate-12 border opacity-[0.07]"
          style={{ animationDuration: "9s", animationDelay: "0.5s" }}
        />

        <div className="relative mx-auto max-w-lg px-4">
          {/* Card container */}
          <div className="bg-background border-border animate-scale-in overflow-hidden border shadow-xl">
            {/* Yellow header strip */}
            <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
              <span className="text-xs font-semibold tracking-wider uppercase">Dashboard</span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>

            <div className="p-8 text-center sm:p-10">
              <div className="bg-accent border-border animate-fade-in-up mx-auto mb-6 flex h-20 w-20 items-center justify-center border shadow-md">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="animate-fade-in-up stagger-1 mb-3 text-2xl font-semibold sm:text-3xl">
                Connect your wallet
              </h2>
              <p className="text-muted-foreground animate-fade-in-up stagger-2 mx-auto mb-8 max-w-sm">
                Connect your Freighter wallet to view your quests, track your progress, and start
                earning USDC.
              </p>
              <Button
                size="lg"
                onClick={connect}
                disabled={walletConnecting}
                className="shimmer-on-hover animate-fade-in-up stagger-3"
              >
                {walletConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </>
                )}
              </Button>

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
            </div>
          </div>

          {/* Decorative accent blocks */}
          <div className="bg-accent border-border animate-fade-in-up stagger-5 absolute -top-4 -right-4 hidden h-10 w-10 rotate-12 border shadow-md sm:block" />
          <div className="bg-success border-border animate-fade-in-up stagger-6 absolute -bottom-3 -left-3 hidden h-8 w-8 -rotate-6 border shadow-sm sm:block" />
        </div>
      </div>
    )
  }

  // We group all return elements into a single return with one parent div to avoid JSX parsing ambiguity
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Welcome banner */}
      <div className="bg-accent border-border animate-fade-in-up relative mb-8 overflow-hidden border p-6 shadow-lg sm:p-8">
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-bold tracking-wider uppercase">Welcome back</span>
            </div>
            <PrefetchLink to={`/creator/${address}`}>
              <h1 className="hover:text-background/80 text-3xl font-semibold transition-colors sm:text-4xl">
                {shortAddress}
              </h1>
            </PrefetchLink>
            <p className="mt-1 text-sm font-bold opacity-70">
              You have {personalStats.questsEnrolled} active quests
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={goToCreateQuest}
            className="shimmer-on-hover group flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            Create quest
          </Button>
          {onLaunchTutorial && (
            <Button
              variant="outline"
              onClick={onLaunchTutorial}
              data-onboarding="tutorial-button"
              className="flex-shrink-0 flex items-center gap-2"
              aria-label="Open getting started tutorial"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Take the tour
            </Button>
          )}
        </div>
      </div>

      {/* Platform Stats Overview removed as requested */}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Personal Stats, Chart, Quests) */}
        <div className="animate-fade-in-up stagger-2 space-y-8 lg:col-span-2">
          {/* Personal Stats */}
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
              <EarningsChart data={earningsHistory} />
            </Suspense>
          </SectionErrorBoundary>

          {/* Your Quests Section */}
          <SectionErrorBoundary label="Your quests">
            <div>
              <div className="relative mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <LayoutDashboard className="h-5 w-5" /> Your Quests
                </h2>
                <div
                  className="border-border flex gap-0 border shadow-md"
                  role="group"
                  aria-label="Quest filter"
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
                      {f === "all" ? "Show all" : f === "owned" ? "Show owned" : "Show enrolled"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search, category filter, and sort */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search quests by name, description, category, or tag"
                    aria-label="Search quests"
                    className="border-border bg-background w-full border py-2.5 pr-9 pl-9 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  aria-label="Filter by category"
                  className="border-border bg-background cursor-pointer border px-3 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-sm focus:outline-none"
                >
                  <option value="all">All categories</option>
                  {availableCategories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Sort quests"
                  className="border-border bg-background cursor-pointer border px-3 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-sm focus:outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="ending-soon">Ending soon</option>
                  <option value="most-enrolled">Most enrolled</option>
                  <option value="highest-reward">Highest reward</option>
                </select>
              </div>

              {/* Preset Filter Chips */}
              <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Preset filters">
                {(
                  [
                    { value: "none", label: "Show all" },
                    { value: "ending-soon", label: "Show ending soon" },
                    { value: "recently-funded", label: "Show recently funded" },
                    { value: "recently-verified", label: "Show recently verified" },
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

              <div className="relative grid gap-5">
                {visibleQuests.map((ws, i) => {
                  const stats = questStats[ws.id] || {
                    enrolleeCount: 0,
                    milestoneCount: 0,
                    poolBalance: 0,
                  }
                  const totalMilestones = stats.milestoneCount
                  // Treat missing/null completion as unknown — never coerce to 0% which
                  // looks like "started but empty". See #1331.
                  const completedCount = questCompletions[ws.id]
                  const hasCompletion =
                    typeof completedCount === "number" && Number.isFinite(completedCount)
                  const startedCount = hasCompletion ? completedCount : 0
                  const notStarted = !hasCompletion || startedCount === 0
                  const totalReward = stats.poolBalance
                  const earnedReward =
                    totalMilestones > 0 && hasCompletion
                      ? (totalReward * startedCount) / totalMilestones
                      : 0
                  const isOwned = !!address && ws.owner === address

                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => goToQuest(ws.id)}
                      aria-label={`Open quest ${ws.name}`}
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
                                {hasCompletion &&
                                  startedCount === totalMilestones &&
                                  totalMilestones > 0 && (
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
                                  <Progress
                                    value={startedCount}
                                    max={totalMilestones}
                                    className="flex-1"
                                  />
                                  <span className="text-muted-foreground text-xs font-bold whitespace-nowrap">
                                    {startedCount}/{totalMilestones}
                                  </span>
                                </div>
                              )}
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

              {sortedQuests.length > visibleQuests.length && !isLoading && !loadError && (
                <p className="text-muted-foreground mt-4 text-xs font-bold">
                  Showing the first {visibleQuests.length} of {sortedQuests.length} quests.
                </p>
              )}

              {sortedQuests.length === 0 && !isLoading && !loadError && (
                <div className="mt-5">
                  <EmptyState
                    variant="default"
                    illustration="dashboard"
                    title={
                      searchQuery || category !== "all"
                        ? "No matching quests"
                        : preset !== "none"
                          ? `No ${preset.replace("-", " ")} quests`
                          : filter === "all"
                            ? "No quests yet"
                            : `No ${filter} quests`
                    }
                    description={
                      searchQuery || category !== "all"
                        ? "No quests match your search and filters. Try broadening them."
                        : preset !== "none"
                          ? `No quests match the "${preset.replace("-", " ")}" filter. Try a different preset.`
                          : filter === "all"
                            ? "Create your first quest to start incentivizing learning with on-chain rewards."
                            : filter === "owned"
                              ? "You haven't created any quests yet. Start one to incentivize learners."
                              : "You haven't enrolled in any quests yet. Browse available quests to get started."
                    }
                    action={
                      filter === "all" || filter === "owned"
                        ? {
                            label: "Create quest",
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
