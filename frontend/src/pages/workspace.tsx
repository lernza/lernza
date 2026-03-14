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
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useInView, useCountUp } from "@/hooks/use-animations"
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
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(
    null
  )

  const ws = MOCK_WORKSPACES.find((w) => w.id === workspaceId)
  const milestones = MOCK_MILESTONES[workspaceId] || []
  const enrollees = MOCK_ENROLLEES[workspaceId] || []
  const completions = MOCK_COMPLETIONS[workspaceId] || []

  const [statsRef, statsInView] = useInView()
  const [contentRef, contentInView] = useInView()

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
  const isComplete =
    completedMilestones === milestones.length && milestones.length > 0
  const earnedReward = milestones
    .filter((m) =>
      completions.some((c) => c.milestoneId === m.id && c.completed)
    )
    .reduce((sum, m) => sum + m.rewardAmount, 0)

  const enrolleesCount = useCountUp(enrollees.length, 400, statsInView)
  const milestonesCount = useCountUp(milestones.length, 400, statsInView)
  const poolBalance = useCountUp(ws.poolBalance, 800, statsInView)
  const totalRewardCount = useCountUp(totalReward, 800, statsInView)

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-30" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer group"
      >
        <div className="w-7 h-7 border-[2px] border-black bg-white shadow-[2px_2px_0_#000] flex items-center justify-center neo-press hover:shadow-[3px_3px_0_#000] active:shadow-[1px_1px_0_#000] group-hover:bg-primary transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Quest header card */}
      <div className="relative bg-white border-[3px] border-black shadow-[6px_6px_0_#000] overflow-hidden mb-8 animate-fade-in-up">
        {/* Header bar */}
        <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider">
              Quest Details
            </span>
            {isComplete && (
              <Badge variant="success" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-success border border-black" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="p-6 relative">
          <div className="absolute inset-0 bg-diagonal-lines pointer-events-none opacity-20" />
          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">{ws.name}</h1>
              <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                {ws.description}
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Button variant="outline" size="sm" className="shimmer-on-hover">
                <UserPlus className="h-4 w-4" />
                Add Enrollee
              </Button>
              <Button size="sm" className="shimmer-on-hover">
                <Plus className="h-4 w-4" />
                Add Milestone
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: Users,
            label: "Enrollees",
            value: enrolleesCount,
            bg: "bg-primary",
          },
          {
            icon: Target,
            label: "Milestones",
            value: milestonesCount,
            bg: "bg-primary",
          },
          {
            icon: Coins,
            label: "Pool Balance",
            value: formatTokens(poolBalance),
            bg: "bg-primary",
          },
          {
            icon: Coins,
            label: "Total Rewards",
            value: formatTokens(totalRewardCount),
            bg: "bg-success",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`reveal-up ${statsInView ? "in-view" : ""}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <Card className="neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000]">
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${stat.bg} border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0`}
                >
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-lg font-black tabular-nums">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Progress section */}
      {milestones.length > 0 && (
        <div className="mb-8 animate-fade-in-up stagger-3">
          <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black">Overall Progress</span>
              <div className="flex items-center gap-3">
                {earnedReward > 0 && (
                  <span className="text-xs font-bold text-green-700">
                    +{formatTokens(earnedReward)} LEARN earned
                  </span>
                )}
                <span className="text-sm font-black">
                  {completedMilestones}/{milestones.length}
                </span>
              </div>
            </div>
            <Progress value={completedMilestones} max={milestones.length} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b-[3px] border-black mb-6" ref={contentRef}>
        {(["milestones", "enrollees"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-black uppercase tracking-wider border-[3px] border-b-0 transition-all capitalize cursor-pointer -mb-[3px] ${
              activeTab === tab
                ? "border-black bg-primary shadow-[2px_-2px_0_#000]"
                : "border-transparent hover:bg-secondary"
            }`}
          >
            {tab}
            <span className="ml-2 text-xs opacity-60">
              ({tab === "milestones" ? milestones.length : enrollees.length})
            </span>
          </button>
        ))}
      </div>

      {/* Milestones tab */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {milestones.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-4">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="font-black mb-2">No milestones yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add milestones to define learning goals.
                </p>
                <Button size="sm" className="shimmer-on-hover">
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
              const isExpanded = expandedMilestone === ms.id

              return (
                <div
                  key={ms.id}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <Card
                    className={`neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] cursor-pointer group transition-all ${
                      isCompleted ? "border-success" : ""
                    }`}
                    onClick={() =>
                      setExpandedMilestone(isExpanded ? null : ms.id)
                    }
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-8 h-8 border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 ${
                            isCompleted ? "bg-success" : "bg-white group-hover:bg-secondary"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3
                              className={`font-black ${isCompleted ? "text-muted-foreground" : ""}`}
                            >
                              {ms.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge
                                variant={isCompleted ? "success" : "default"}
                              >
                                {ms.rewardAmount} LEARN
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="mt-3 animate-fade-in-up">
                              <p className="text-sm text-muted-foreground mb-3">
                                {ms.description}
                              </p>
                              {completedBy.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-bold text-muted-foreground mb-2">
                                    Completed by:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {completedBy.map((addr) => (
                                      <span
                                        key={addr}
                                        className="text-xs font-mono font-bold bg-success/10 border-[1.5px] border-black px-2 py-1 shadow-[1px_1px_0_#000]"
                                      >
                                        {addr}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!isCompleted && enrollees.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="shimmer-on-hover"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Verify Completion
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
                <div className="w-14 h-14 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-black mb-2">No enrollees yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add learners to this quest.
                </p>
                <Button size="sm" className="shimmer-on-hover">
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
              const isAllDone =
                completed === milestones.length && milestones.length > 0

              return (
                <div
                  key={addr}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <Card className="neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] group">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center text-sm font-mono font-black group-hover:shadow-[3px_3px_0_#000] transition-shadow">
                            {addr.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-bold">
                                {addr}
                              </p>
                              {isAllDone && (
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                              )}
                            </div>
                            <p className="text-xs font-bold text-muted-foreground">
                              {completed}/{milestones.length} milestones
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="success" className="tabular-nums">
                            +{formatTokens(earned)} LEARN
                          </Badge>
                          <p className="text-xs font-bold text-muted-foreground mt-1">
                            earned
                          </p>
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
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
