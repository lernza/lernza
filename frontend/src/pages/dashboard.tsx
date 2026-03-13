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
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="rounded-full bg-muted p-4 mb-6">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect your wallet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Connect your Freighter wallet to view your workspaces and track your
            progress.
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your workspaces and progress
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: Coins,
            label: "Total Earned",
            value: `${formatTokens(stats.totalEarned)} LEARN`,
            color: "text-primary",
          },
          {
            icon: Users,
            label: "Workspaces Owned",
            value: stats.workspacesOwned.toString(),
            color: "text-foreground",
          },
          {
            icon: Target,
            label: "Enrolled In",
            value: stats.workspacesEnrolled.toString(),
            color: "text-foreground",
          },
          {
            icon: Target,
            label: "Milestones Done",
            value: stats.milestonesCompleted.toString(),
            color: "text-success",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workspaces */}
      <h2 className="text-lg font-semibold mb-4">Your Workspaces</h2>
      <div className="grid gap-4">
        {MOCK_WORKSPACES.map((ws) => {
          const milestones = MOCK_MILESTONES[ws.id] || []
          const completions = MOCK_COMPLETIONS[ws.id] || []
          const totalMilestones = milestones.length
          const completedCount = new Set(
            completions.filter((c) => c.completed).map((c) => c.milestoneId)
          ).size

          return (
            <Card
              key={ws.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
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
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm mb-3">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {ws.enrolleeCount} enrolled
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Target className="h-3 w-3" />
                    {ws.milestoneCount} milestones
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-primary">
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
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No workspaces yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a workspace to start incentivizing learning.
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
