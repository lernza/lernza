import {
  Plus,
  Users,
  Target,
  Coins,
  ChevronRight,
  Wallet,
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
  MOCK_USER_STATS,
} from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"

interface DashboardProps {
  onSelectWorkspace: (id: number) => void
}

export function Dashboard({ onSelectWorkspace }: DashboardProps) {
  const { connected, connect } = useWallet()
  const stats = MOCK_USER_STATS

  if (!connected) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="flex flex-col items-center justify-center text-center py-16 animate-fade-in-up">
          <div className="w-20 h-20 bg-secondary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-8">
            <Wallet className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black mb-3">Connect your wallet</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Connect your Freighter wallet to view your quests and track your progress.
          </p>
          <Button onClick={connect}>
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Subtle geometric accents */}
      <div className="absolute top-12 right-8 w-16 h-16 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] rotate-12 opacity-[0.06] pointer-events-none hidden xl:block" />
      <div className="absolute top-40 right-4 w-8 h-8 bg-primary border-[2px] border-black opacity-[0.08] -rotate-6 pointer-events-none hidden xl:block" />

      {/* Header */}
      <div className="flex items-center justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1">
            Your quests and progress
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Quest
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          {
            icon: Coins,
            label: "Total Earned",
            value: `${formatTokens(stats.totalEarned)} LEARN`,
            bg: "bg-primary",
          },
          {
            icon: Users,
            label: "Quests Owned",
            value: stats.workspacesOwned.toString(),
            bg: "bg-blue-200",
          },
          {
            icon: Target,
            label: "Enrolled In",
            value: stats.workspacesEnrolled.toString(),
            bg: "bg-pink-200",
          },
          {
            icon: Target,
            label: "Milestones Done",
            value: stats.milestonesCompleted.toString(),
            bg: "bg-success",
          },
        ].map((stat, i) => (
          <Card key={stat.label} className={`animate-fade-in-up stagger-${i + 1}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 ${stat.bg} border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-black">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workspaces */}
      <h2 className="text-xl font-black mb-5">Your Quests</h2>
      <div className="grid gap-5">
        {MOCK_WORKSPACES.map((ws, i) => {
          const milestones = MOCK_MILESTONES[ws.id] || []
          const completions = MOCK_COMPLETIONS[ws.id] || []
          const totalMilestones = milestones.length
          const completedCount = new Set(
            completions.filter((c) => c.completed).map((c) => c.milestoneId)
          ).size

          return (
            <Card
              key={ws.id}
              className={`neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] cursor-pointer animate-fade-in-up stagger-${i + 1}`}
              onClick={() => onSelectWorkspace(ws.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{ws.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {ws.description}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-secondary border-[2px] border-black flex items-center justify-center flex-shrink-0 ml-3">
                    <ChevronRight className="h-4 w-4" />
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
                    {formatTokens(ws.poolBalance)} LEARN
                  </Badge>
                </div>
                {totalMilestones > 0 && (
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
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {MOCK_WORKSPACES.length === 0 && (
        <Card className="animate-fade-in-up">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-secondary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-6">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-black mb-2">No quests yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create a quest to start incentivizing learning.
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Create Quest
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
