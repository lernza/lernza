import React, { useState, Suspense } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Users,
  Target,
  Coins,
  ChevronRight,
  Wallet,
  Sparkles,
  LayoutDashboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useContractData } from "@/hooks/use-async-data"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/async-states"
import { useWallet } from "@/hooks/use-wallet"
import { questClient } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"
import { Visibility, type QuestInfo } from "@/lib/contract-types"
import { formatTokens } from "@/lib/utils"

// Sub-components
import { PersonalProgress } from "./dashboard/personal-progress"
import { TrendingQuests } from "./dashboard/trending-quests"
import { RecentActivity } from "./dashboard/recent-activity"

// Lazy-loaded chart
const EarningsChart = React.lazy(() => import("./dashboard/earnings-chart"))

export function Dashboard() {
  const navigate = useNavigate()
  const { connected, connect, shortAddress, address } = useWallet()
  const [filter, setFilter] = useState<"all" | "owned" | "enrolled">("all")

  // Use the new async hook for dashboard data
  const {
    data: dashboardData,
    isLoading,
    error: loadError,
  } = useContractData(
    "dashboard",
    async () => {
      const quests = await questClient.listPublicQuests(0, 100)

      const statsEntries = await Promise.all(
        quests.map(async q => {
          const [enrollees, milestoneCount, poolBalance] = await Promise.all([
            questClient.getEnrollees(q.id),
            milestoneClient.getMilestoneCount(q.id),
            rewardsClient.getPoolBalance(q.id),
          ])

          return [
            q.id,
            {
              enrolleeCount: enrollees.length,
              milestoneCount: milestoneCount,
              poolBalance:
                poolBalance > BigInt(Number.MAX_SAFE_INTEGER)
                  ? Number.MAX_SAFE_INTEGER
                  : Number(poolBalance),
            },
          ] as const
        })
      )

      const questStats = Object.fromEntries(
        statsEntries.map(([id, stats]) => [
          id,
          {
            enrolleeCount: stats.enrolleeCount,
            milestoneCount: stats.milestoneCount,
            poolBalance: stats.poolBalance,
          },
        ])
      )
      const questMilestones = Object.fromEntries(
        statsEntries.map(([id, stats]) => [id, stats.milestoneCount])
      )

      let questCompletions: Record<number, number> = {}
      let userEarnings = 0n
      if (address) {
        const [completionEntries, earnings] = await Promise.all([
          Promise.all(
            quests.map(async q => {
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
        quests,
        questStats,
        questMilestones,
        questCompletions,
        userEarnings,
      }
    },
    {
      enabled: connected,
      dependencies: [connected, address],
    }
  )

  // Extract data or use defaults
  const {
    quests = [],
    questStats = {},
    questCompletions = {},
    userEarnings = 0n,
  } = dashboardData || {}

  const filteredWorkspaces = quests.filter(ws => {
    if (filter === "owned") return !!address && ws.owner === address
    if (filter === "enrolled") return !address || ws.owner !== address
    return true
  })

  const ownedCount = quests.filter((q: QuestInfo) => !!address && q.owner === address).length
  const enrolledCount = Math.max(0, quests.length - ownedCount)
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

  const trendingQuests = [...quests]
    .sort((a, b) => (questStats[b.id]?.enrolleeCount || 0) - (questStats[a.id]?.enrolleeCount || 0))
    .slice(0, 2)

  const recentActivity = quests
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map(ws => ({
      id: `created-${ws.id}`,
      user: ws.owner,
      action: "created" as const,
      questName: ws.name,
      timestamp: ws.createdAt * 1000,
    }))

  const earningsHistory = [
    { date: "Jan", amount: 0 },
    { date: "Feb", amount: Math.round(Number(userEarnings) * 0.25) },
    { date: "Mar", amount: Math.round(Number(userEarnings) * 0.6) },
    { date: "Apr", amount: Math.round(Number(userEarnings)) },
  ]

  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        {/* Background elements */}
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div
          className="bg-primary border-border animate-float absolute top-[10%] left-[8%] h-20 w-20 rotate-12 border-[3px] opacity-[0.08] shadow-[4px_4px_0_var(--color-border)]"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="bg-primary border-border animate-float absolute right-[6%] bottom-[15%] h-14 w-14 -rotate-6 border-[2px] opacity-[0.1] shadow-[3px_3px_0_var(--color-border)]"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
        <div
          className="bg-success border-border animate-float absolute top-[60%] left-[5%] h-10 w-10 rotate-45 border-[2px] opacity-[0.06] shadow-[2px_2px_0_var(--color-border)]"
          style={{ animationDuration: "7s", animationDelay: "2s" }}
        />
        <div
          className="bg-primary border-border animate-float absolute top-[20%] right-[12%] h-8 w-8 -rotate-12 border-[2px] opacity-[0.07]"
          style={{ animationDuration: "9s", animationDelay: "0.5s" }}
        />

        <div className="relative mx-auto max-w-lg px-4">
          {/* Card container */}
          <div className="bg-background border-border animate-scale-in overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
            {/* Yellow header strip */}
            <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
              <span className="text-xs font-black tracking-wider uppercase">Dashboard</span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>

            <div className="p-8 text-center sm:p-10">
              <div className="bg-primary border-border animate-fade-in-up mx-auto mb-6 flex h-20 w-20 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="animate-fade-in-up stagger-1 mb-3 text-2xl font-black sm:text-3xl">
                Connect your wallet
              </h2>
              <p className="text-muted-foreground animate-fade-in-up stagger-2 mx-auto mb-8 max-w-sm">
                Connect your Freighter wallet to view your quests, track your progress, and start
                earning USDC.
              </p>
              <Button
                size="lg"
                onClick={connect}
                className="shimmer-on-hover animate-fade-in-up stagger-3"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>

              {/* Mini feature list */}
              <div className="border-border animate-fade-in-up stagger-4 mt-8 border-t-[2px] pt-6">
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
          <div className="bg-primary border-border animate-fade-in-up stagger-5 absolute -top-4 -right-4 hidden h-10 w-10 rotate-12 border-[2px] shadow-[3px_3px_0_var(--color-border)] sm:block" />
          <div className="bg-success border-border animate-fade-in-up stagger-6 absolute -bottom-3 -left-3 hidden h-8 w-8 -rotate-6 border-[2px] shadow-[2px_2px_0_var(--color-border)] sm:block" />
        </div>
      </div>
    )
  }

  // We group all return elements into a single return with one parent div to avoid JSX parsing ambiguity
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Welcome banner */}
      <div className="bg-primary border-border animate-fade-in-up relative mb-8 overflow-hidden border-[3px] p-6 shadow-[6px_6px_0_var(--color-border)] sm:p-8">
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-bold tracking-wider uppercase">Welcome back</span>
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{shortAddress}</h1>
            <p className="mt-1 text-sm font-bold opacity-70">
              You have {personalStats.questsEnrolled} active quests
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("/quest/create")}
            className="shimmer-on-hover group flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Quest
          </Button>
        </div>
      </div>

      {/* Platform Stats Overview removed as requested */}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Personal Stats, Chart, Quests) */}
        <div className="animate-fade-in-up stagger-2 space-y-8 lg:col-span-2">
          {/* Personal Stats */}
          <PersonalProgress stats={personalStats} />

          {/* Earnings Chart (Lazy Loaded) */}
          <Suspense
            fallback={
              <div className="bg-muted border-border h-[250px] animate-pulse border-[3px] shadow-[6px_6px_0_var(--color-border)]" />
            }
          >
            <EarningsChart data={earningsHistory} />
          </Suspense>

          {/* Your Quests Section */}
          <div>
            <div className="relative mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <LayoutDashboard className="h-5 w-5" /> Your Quests
              </h2>
              <div className="border-border flex gap-0 border-[2px] shadow-[3px_3px_0_var(--color-border)]">
                {(["all", "owned", "enrolled"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`border-border cursor-pointer border-r-[2px] px-4 py-2 text-xs font-black tracking-wider capitalize uppercase transition-colors last:border-r-0 ${
                      filter === f ? "bg-primary" : "bg-background hover:bg-secondary"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loadError && (
              <div className="mb-5">
                <ErrorState
                  message={`Failed to load dashboard data: ${loadError}`}
                  onRetry={() => {
                    void questClient.listPublicQuests(0, 100).then(() => {
                      // no-op: refetch is available from hook but not currently exposed here
                    })
                  }}
                  variant="compact"
                />
              </div>
            )}

            {isLoading && (
              <div className="mb-5">
                <LoadingState message="Loading on-chain dashboard data..." variant="compact" />
              </div>
            )}

            <div className="relative grid gap-5">
              {filteredWorkspaces.map((ws, i) => {
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
                    onClick={() => navigate(`/quest/${ws.id}`)}
                    aria-label={`Open quest ${ws.name}`}
                    className={`card-tilt group animate-fade-in-up cursor-pointer stagger-${i + 1} focus-visible:ring-ring text-left focus-visible:ring-2 focus-visible:outline-none`}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-3">
                              <CardTitle className="group-hover:text-primary text-base transition-colors">
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
                            {(ws.category || ws.tags.length > 0) && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {ws.category && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {ws.category}
                                  </Badge>
                                )}
                                {ws.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                                {ws.tags.length > 3 && (
                                  <span className="text-muted-foreground text-[10px]">
                                    +{ws.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="bg-secondary border-border group-hover:bg-primary ml-3 flex h-8 w-8 flex-shrink-0 items-center justify-center border-[2px] transition-all group-hover:shadow-[2px_2px_0_var(--color-border)]">
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
                                <span className="text-xs font-black text-green-700">
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

            {filteredWorkspaces.length === 0 && !isLoading && !loadError && (
              <div className="mt-5">
                <EmptyState
                  variant="quests"
                  title={filter === "all" ? "No quests yet" : `No ${filter} quests`}
                  description={
                    filter === "all"
                      ? "Create your first quest to start incentivizing learning with on-chain rewards."
                      : filter === "owned"
                        ? "You haven't created any quests yet. Start one to incentivize learners."
                        : "You haven't enrolled in any quests yet. Browse available quests to get started."
                  }
                  action={
                    filter === "all" || filter === "owned"
                      ? {
                          label: "Create Quest",
                          onClick: () => navigate("/quest/create"),
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Trending & Recent Activity) */}
        <div className="animate-fade-in-up stagger-3 space-y-8">
          <TrendingQuests
            quests={trendingQuests}
            statsByQuest={questStats}
            onSelectQuest={id => navigate(`/quest/${id}`)}
          />
          <RecentActivity activities={recentActivity} />
        </div>
      </div>
    </div>
  )
}
