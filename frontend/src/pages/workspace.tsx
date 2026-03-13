import { useState } from "react"
import {
  ArrowLeft,
  Plus,
  Users,
  Target,
  Coins,
  CheckCircle2,
  Circle,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  MOCK_WORKSPACES,
  MOCK_MILESTONES,
  MOCK_ENROLLEES,
  MOCK_COMPLETIONS,
} from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"

interface WorkspaceViewProps {
  workspaceId: number
  onBack: () => void
}

type Tab = "milestones" | "enrollees"

export function WorkspaceView({ workspaceId, onBack }: WorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("milestones")

  const ws = MOCK_WORKSPACES.find((w) => w.id === workspaceId)
  const milestones = MOCK_MILESTONES[workspaceId] || []
  const enrollees = MOCK_ENROLLEES[workspaceId] || []
  const completions = MOCK_COMPLETIONS[workspaceId] || []

  if (!ws) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Workspace not found</h2>
        <Button variant="outline" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  }

  const totalReward = milestones.reduce((sum, m) => sum + m.rewardAmount, 0)
  const completedMilestones = new Set(
    completions.filter((c) => c.completed).map((c) => c.milestoneId)
  ).size

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Back + header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{ws.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            {ws.description}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4" />
            Add Enrollee
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Enrollees</p>
              <p className="text-lg font-bold">{enrollees.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Milestones</p>
              <p className="text-lg font-bold">{milestones.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Pool Balance</p>
              <p className="text-lg font-bold text-primary">
                {formatTokens(ws.poolBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Rewards</p>
              <p className="text-lg font-bold">{formatTokens(totalReward)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {milestones.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Overall Progress
            </span>
            <span className="text-sm font-medium">
              {completedMilestones}/{milestones.length} milestones
            </span>
          </div>
          <Progress value={completedMilestones} max={milestones.length} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(["milestones", "enrollees"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize cursor-pointer ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "milestones" && (
        <div className="space-y-3">
          {milestones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Target className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No milestones yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add milestones to define learning goals.
                </p>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Add Milestone
                </Button>
              </CardContent>
            </Card>
          ) : (
            milestones.map((ms) => {
              const isCompleted = completions.some(
                (c) => c.milestoneId === ms.id && c.completed
              )
              const completedBy = completions
                .filter((c) => c.milestoneId === ms.id && c.completed)
                .map((c) => c.enrollee)

              return (
                <Card
                  key={ms.id}
                  className={isCompleted ? "border-success/30" : ""}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium">{ms.title}</h3>
                          <Badge
                            variant={isCompleted ? "success" : "outline"}
                            className="flex-shrink-0"
                          >
                            {ms.rewardAmount} LEARN
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {ms.description}
                        </p>
                        {completedBy.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Completed by:{" "}
                            <span className="font-mono">
                              {completedBy.join(", ")}
                            </span>
                          </p>
                        )}
                        {!isCompleted && enrollees.length > 0 && (
                          <div className="mt-3">
                            <Button variant="outline" size="sm">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Verify Completion
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {activeTab === "enrollees" && (
        <div className="space-y-3">
          {enrollees.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Users className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No enrollees yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add learners to this workspace.
                </p>
                <Button size="sm">
                  <UserPlus className="h-4 w-4" />
                  Add Enrollee
                </Button>
              </CardContent>
            </Card>
          ) : (
            enrollees.map((addr) => {
              const completed = completions.filter(
                (c) => c.enrollee === addr && c.completed
              ).length
              const earned = milestones
                .filter((m) =>
                  completions.some(
                    (c) =>
                      c.enrollee === addr &&
                      c.milestoneId === m.id &&
                      c.completed
                  )
                )
                .reduce((sum, m) => sum + m.rewardAmount, 0)

              return (
                <Card key={addr}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-mono font-bold">
                          {addr.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-mono text-sm">{addr}</p>
                          <p className="text-xs text-muted-foreground">
                            {completed}/{milestones.length} milestones
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">
                          {formatTokens(earned)} LEARN
                        </p>
                        <p className="text-xs text-muted-foreground">earned</p>
                      </div>
                    </div>
                    {milestones.length > 0 && (
                      <Progress
                        value={completed}
                        max={milestones.length}
                        className="mt-3"
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
