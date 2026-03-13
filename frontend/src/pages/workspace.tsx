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
        <h2 className="text-2xl font-black mb-4">Quest not found</h2>
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
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer"
      >
        <div className="w-7 h-7 border-[2px] border-black bg-white shadow-[2px_2px_0_#000] flex items-center justify-center neo-press hover:shadow-[3px_3px_0_#000] active:shadow-[1px_1px_0_#000]">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black">{ws.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            {ws.description}
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
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
        {[
          { icon: Users, label: "Enrollees", value: enrollees.length, bg: "bg-blue-200" },
          { icon: Target, label: "Milestones", value: milestones.length, bg: "bg-pink-200" },
          { icon: Coins, label: "Pool Balance", value: formatTokens(ws.poolBalance), bg: "bg-primary" },
          { icon: Coins, label: "Total Rewards", value: formatTokens(totalReward), bg: "bg-green-200" },
        ].map((stat, i) => (
          <Card key={stat.label} className={`animate-fade-in-up stagger-${i + 1}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${stat.bg} border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-black">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      {milestones.length > 0 && (
        <div className="mb-8 animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground">Overall Progress</span>
            <span className="text-sm font-black">
              {completedMilestones}/{milestones.length} milestones
            </span>
          </div>
          <Progress value={completedMilestones} max={milestones.length} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b-[3px] border-black mb-6">
        {(["milestones", "enrollees"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-black uppercase tracking-wider border-[3px] border-b-0 transition-colors capitalize cursor-pointer -mb-[3px] ${
              activeTab === tab
                ? "border-black bg-primary"
                : "border-transparent hover:bg-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Milestones tab */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {milestones.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 bg-secondary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-4">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="font-black mb-2">No milestones yet</h3>
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
            milestones.map((ms, i) => {
              const isCompleted = completions.some(
                (c) => c.milestoneId === ms.id && c.completed
              )
              const completedBy = completions
                .filter((c) => c.milestoneId === ms.id && c.completed)
                .map((c) => c.enrollee)

              return (
                <Card
                  key={ms.id}
                  className={`animate-fade-in-up stagger-${i + 1} ${isCompleted ? "border-success" : ""}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isCompleted ? "bg-success" : "bg-white"
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-black">{ms.title}</h3>
                          <Badge
                            variant={isCompleted ? "success" : "default"}
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
                            <span className="font-mono font-bold">
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

      {/* Enrollees tab */}
      {activeTab === "enrollees" && (
        <div className="space-y-4">
          {enrollees.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 bg-secondary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-black mb-2">No enrollees yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add learners to this quest.
                </p>
                <Button size="sm">
                  <UserPlus className="h-4 w-4" />
                  Add Enrollee
                </Button>
              </CardContent>
            </Card>
          ) : (
            enrollees.map((addr, i) => {
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
                <Card key={addr} className={`animate-fade-in-up stagger-${i + 1}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center text-sm font-mono font-black">
                          {addr.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold">{addr}</p>
                          <p className="text-xs font-bold text-muted-foreground">
                            {completed}/{milestones.length} milestones
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="success">
                          +{formatTokens(earned)} LEARN
                        </Badge>
                        <p className="text-xs font-bold text-muted-foreground mt-1">earned</p>
                      </div>
                    </div>
                    {milestones.length > 0 && (
                      <Progress
                        value={completed}
                        max={milestones.length}
                        className="mt-4"
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
