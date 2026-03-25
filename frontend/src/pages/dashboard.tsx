import React, { useState, Suspense } from "react"
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
  MOCK_WORKSPACES,
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

// The first two workspaces share the same owner — treat them as "owned"
const MOCK_OWNER = "GBXR...K2YQ"

interface DashboardProps {
  onSelectWorkspace: (id: number) => void
  onCreateQuest: () => void
}

export function Dashboard({ onSelectWorkspace, onCreateQuest }: DashboardProps) {
  const { connected, connect, shortAddress } = useWallet()
  const [filter, setFilter] = useState<"all" | "owned" | "enrolled">("all")

  if (!connected) {
    return (
      <div className="min-h-[calc(100vh-67px)] flex items-center justify-center relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-grid-dots pointer-events-none" />
        <div className="absolute top-[10%] left-[8%] w-20 h-20 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] rotate-12 opacity-[0.08] animate-float" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[15%] right-[6%] w-14 h-14 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-6 opacity-[0.1] animate-float" style={{ animationDuration: "6s", animationDelay: "1s" }} />
        <div className="absolute top-[60%] left-[5%] w-10 h-10 bg-success border-[2px] border-black shadow-[2px_2px_0_#000] rotate-45 opacity-[0.06] animate-float" style={{ animationDuration: "7s", animationDelay: "2s" }} />
        <div className="absolute top-[20%] right-[12%] w-8 h-8 bg-primary border-[2px] border-black opacity-[0.07] -rotate-12 animate-float" style={{ animationDuration: "9s", animationDelay: "0.5s" }} />

        <div className="relative px-4 max-w-lg mx-auto">
          {/* Card container */}
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0_#000] overflow-hidden animate-scale-in">
            {/* Yellow header strip */}
            <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Dashboard</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-destructive border border-black" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>

            <div className="p-8 sm:p-10 text-center">
              <div className="w-20 h-20 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-6 mx-auto animate-fade-in-up">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-3 animate-fade-in-up stagger-1">
                Connect your wallet
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto animate-fade-in-up stagger-2">
                Connect your Freighter wallet to view your quests, track your
                progress, and start earning USDC.
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
              <div className="mt-8 pt-6 border-t-[2px] border-black animate-fade-in-up stagger-4">
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Target, text: "Track quests" },
                    { icon: Coins, text: "Earn tokens" },
                    { icon: Sparkles, text: "On-chain" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-secondary border-[1.5px] border-black flex items-center justify-center">
                        <item.icon className="h-3 w-3" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Decorative accent blocks */}
          <div className="absolute -top-4 -right-4 w-10 h-10 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-12 animate-fade-in-up stagger-5 hidden sm:block" />
          <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-success border-[2px] border-black shadow-[2px_2px_0_#000] -rotate-6 animate-fade-in-up stagger-6 hidden sm:block" />
        </div>
      </div>
    )
  }

  // Apply filter
  const filteredWorkspaces = MOCK_WORKSPACES.filter((ws) => {
    if (filter === "owned") return ws.owner === MOCK_OWNER
    if (filter === "enrolled") return ws.owner !== MOCK_OWNER
    return true
  })

  return (
    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Welcome banner */}
      <div className="relative bg-primary border-[3px] border-black shadow-[6px_6px_0_#000] p-6 sm:p-8 mb-8 overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 bg-diagonal-lines pointer-events-none opacity-30" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Welcome back</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black">
              {shortAddress}
            </h1>
            <p className="text-sm font-bold opacity-70 mt-1">
              You have {MOCK_USER_STATS.workspacesEnrolled} active quests
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={onCreateQuest}
            className="shimmer-on-hover group flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Quest
          </Button>
        </div>
      </div>

      {/* Platform Stats Overview */}
      <PlatformStats stats={MOCK_PLATFORM_STATS} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Personal Stats, Chart, Quests) */}
        <div className="lg:col-span-2 space-y-8 animate-fade-in-up stagger-2">
          
          {/* Personal Stats */}
          <PersonalProgress stats={MOCK_USER_STATS} />

          {/* Earnings Chart (Lazy Loaded) */}
          <Suspense fallback={<div className="h-[250px] animate-pulse bg-muted border-[3px] border-black shadow-[6px_6px_0_#000]" />}>
            <EarningsChart data={MOCK_EARNINGS_HISTORY} />
          </Suspense>

          {/* Your Quests Section */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 relative">
              <h2 className="text-xl font-black flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" /> Your Quests
              </h2>
              <div className="flex gap-0 border-[2px] border-black shadow-[3px_3px_0_#000]">
                {(["all", "owned", "enrolled"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors capitalize cursor-pointer border-r-[2px] border-black last:border-r-0 ${
                      filter === f
                        ? "bg-primary"
                        : "bg-white hover:bg-secondary"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 relative">
              {filteredWorkspaces.map((ws, i) => {
                const milestones = MOCK_MILESTONES[ws.id] || []
                const completions = MOCK_COMPLETIONS[ws.id] || []
                const totalMilestones = milestones.length
                const completedCount = new Set(
                  completions.filter((c) => c.completed).map((c) => c.milestoneId)
                ).size
                const totalReward = milestones.reduce(
                  (sum, m) => sum + m.rewardAmount,
                  0
                )
                const earnedReward = milestones
                  .filter((m) =>
                    completions.some(
                      (c) => c.milestoneId === m.id && c.completed
                    )
                  )
                  .reduce((sum, m) => sum + m.rewardAmount, 0)
                const isOwned = ws.owner === MOCK_OWNER

                return (
                  <Card
                    key={ws.id}
                    className={`card-tilt cursor-pointer group animate-fade-in-up stagger-${i + 1}`}
                    onClick={() => onSelectWorkspace(ws.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <CardTitle className="text-base group-hover:text-primary transition-colors">
                              {ws.name}
                            </CardTitle>
                            {completedCount === totalMilestones &&
                              totalMilestones > 0 && (
                                <Badge variant="success" className="gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Complete
                                </Badge>
                              )}
                            <Badge variant={isOwned ? "default" : "secondary"} className="text-[10px]">
                              {isOwned ? "Owner" : "Enrolled"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {ws.description}
                          </p>
                        </div>
                        <div className="w-8 h-8 bg-secondary border-[2px] border-black flex items-center justify-center flex-shrink-0 ml-3 group-hover:bg-primary group-hover:shadow-[2px_2px_0_#000] transition-all">
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
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
                            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                              {completedCount}/{totalMilestones}
                            </span>
                          </div>
                          {earnedReward > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-muted-foreground">
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

            {filteredWorkspaces.length === 0 && (
              <Card className="animate-fade-in-up mt-5">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-6">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="font-black text-lg mb-2">
                    {filter === "all" ? "No quests yet" : `No ${filter} quests`}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    {filter === "all"
                      ? "Create your first quest to start incentivizing learning with on-chain rewards."
                      : filter === "owned"
                        ? "You haven't created any quests yet. Start one to incentivize learners."
                        : "You haven't enrolled in any quests yet. Browse available quests to get started."}
                  </p>
                  {filter === "all" || filter === "owned" ? (
                    <Button onClick={onCreateQuest} className="shimmer-on-hover">
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
        <div className="space-y-8 animate-fade-in-up stagger-3">
          <TrendingQuests 
            quests={MOCK_TRENDING_QUESTS} 
            onSelectQuest={onSelectWorkspace} 
          />
          <RecentActivity activities={MOCK_RECENT_ACTIVITY} />
        </div>
      </div>
    </div>
  )
}
