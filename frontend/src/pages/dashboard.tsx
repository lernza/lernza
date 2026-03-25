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
  Search,
  LayoutDashboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/hooks/use-wallet"
import {
  MOCK_QUESTS,
  MOCK_MILESTONES,
  MOCK_COMPLETIONS,
  MOCK_PLATFORM_STATS,
  MOCK_TRENDING_QUESTS,
  MOCK_USER_STATS,
  MOCK_RECENT_ACTIVITY,
  MOCK_EARNINGS_HISTORY,
} from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"

// Sub-components
import { PlatformStats } from "./dashboard/platform-stats"
import { PersonalProgress } from "./dashboard/personal-progress"
import { TrendingQuests } from "./dashboard/trending-quests"
import { RecentActivity } from "./dashboard/recent-activity"

// Lazy-loaded chart
const EarningsChart = React.lazy(() => import("./dashboard/earnings-chart"))

// The first two quests share the same owner — treat them as "owned"
const MOCK_OWNER = "GBXR...K2YQ"

export function Dashboard() {
  const navigate = useNavigate()
  const { connected, connect, shortAddress } = useWallet()
  const [filter, setFilter] = useState<"all" | "owned" | "enrolled">("all")

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

  // Apply filter
  const filteredQuests = MOCK_QUESTS.filter(ws => {
    if (filter === "owned") return ws.owner === MOCK_OWNER
    if (filter === "enrolled") return ws.owner !== MOCK_OWNER
    return true
  })

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
              You have {MOCK_USER_STATS.questsEnrolled} active quests
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

      {/* Platform Stats Overview */}
      <PlatformStats stats={MOCK_PLATFORM_STATS} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Personal Stats, Chart, Quests) */}
        <div className="animate-fade-in-up stagger-2 space-y-8 lg:col-span-2">
          {/* Personal Stats */}
          <PersonalProgress stats={MOCK_USER_STATS} />

          {/* Earnings Chart (Lazy Loaded) */}
          <Suspense
            fallback={
              <div className="bg-muted border-border h-[250px] animate-pulse border-[3px] shadow-[6px_6px_0_var(--color-border)]" />
            }
          >
            <EarningsChart data={MOCK_EARNINGS_HISTORY} />
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

            <div className="relative grid gap-5">
              {filteredQuests.map((ws, i) => {
                const milestones = MOCK_MILESTONES[ws.id] || []
                const completions = MOCK_COMPLETIONS[ws.id] || []
                const totalMilestones = milestones.length
                const completedCount = new Set(
                  completions.filter(c => c.completed).map(c => c.milestoneId)
                ).size
                const totalReward = milestones.reduce((sum, m) => sum + m.rewardAmount, 0)
                const earnedReward = milestones
                  .filter(m => completions.some(c => c.milestoneId === m.id && c.completed))
                  .reduce((sum, m) => sum + m.rewardAmount, 0)
                const isOwned = ws.owner === MOCK_OWNER

                return (
                  <Card
                    key={ws.id}
                    className={`card-tilt group animate-fade-in-up cursor-pointer stagger-${i + 1}`}
                    onClick={() => navigate(`/quest/${ws.id}`)}
                  >
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
                          {ws.enrolleeCount} enrolled
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Target className="h-3 w-3" />
                          {ws.milestoneCount} milestones
                        </Badge>
                        <Badge variant="default" className="gap-1">
                          <Coins className="h-3 w-3" />
                          {formatTokens(ws.poolBalance)} USDC
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
                )
              })}
            </div>

            {filteredQuests.length === 0 && (
              <Card className="animate-fade-in-up mt-5">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-primary border-border mb-6 flex h-16 w-16 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-black">
                    {filter === "all" ? "No quests yet" : `No ${filter} quests`}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                    {filter === "all"
                      ? "Create your first quest to start incentivizing learning with on-chain rewards."
                      : filter === "owned"
                        ? "You haven't created any quests yet. Start one to incentivize learners."
                        : "You haven't enrolled in any quests yet. Browse available quests to get started."}
                  </p>
                  {filter === "all" || filter === "owned" ? (
                    <Button onClick={() => navigate("/quest/create")} className="shimmer-on-hover">
                      <Plus className="h-4 w-4" />
                      Create Quest
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column (Trending & Recent Activity) */}
        <div className="animate-fade-in-up stagger-3 space-y-8">
          <TrendingQuests quests={MOCK_TRENDING_QUESTS} onSelectQuest={id => navigate(`/quest/${id}`)} />
          <RecentActivity activities={MOCK_RECENT_ACTIVITY} />
        </div>
      </div>
    </div>
  )
}
