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
import { MOCK_WORKSPACES, MOCK_MILESTONES, MOCK_ENROLLEES, MOCK_COMPLETIONS } from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ToastContainer } from "@/components/toast"
import { ShareButton } from "@/components/share-button"

interface WorkspaceViewProps {
  workspaceId: number
  onBack: () => void
}

type Tab = "milestones" | "enrollees"

export function WorkspaceView({ workspaceId, onBack }: WorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("milestones")
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null)

  const ws = MOCK_WORKSPACES.find(w => w.id === workspaceId)
  const milestones = MOCK_MILESTONES[workspaceId] || []
  const enrollees = MOCK_ENROLLEES[workspaceId] || []
  const completions = MOCK_COMPLETIONS[workspaceId] || []
const { toasts, addToast, removeToast } = useToast()
  const [statsRef, statsInView] = useInView()
  const [contentRef, contentInView] = useInView()

  const totalReward = milestones.reduce((sum, m) => sum + m.rewardAmount, 0)
  const completedMilestones = new Set(completions.filter(c => c.completed).map(c => c.milestoneId))
    .size
  const isComplete = completedMilestones === milestones.length && milestones.length > 0
  const earnedReward = milestones
    .filter(m => completions.some(c => c.milestoneId === m.id && c.completed))
    .reduce((sum, m) => sum + m.rewardAmount, 0)

  const enrolleesCount = useCountUp(enrollees.length, 400, statsInView)
  const milestonesCount = useCountUp(milestones.length, 400, statsInView)
  const poolBalance = useCountUp(ws?.poolBalance ?? 0, 800, statsInView)
  const totalRewardCount = useCountUp(totalReward, 800, statsInView)

  if (!ws) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="mb-4 text-2xl font-black">Quest not found</h2>
        <Button variant="outline" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Background */}
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
      >
        <div className="neo-press group-hover:bg-primary flex h-7 w-7 items-center justify-center border-[2px] border-black bg-white shadow-[2px_2px_0_#000] transition-colors hover:shadow-[3px_3px_0_#000] active:shadow-[1px_1px_0_#000]">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Quest header card */}
      <div className="animate-fade-in-up relative mb-8 overflow-hidden border-[3px] border-black bg-white shadow-[6px_6px_0_#000]">
        {/* Header bar */}
        <div className="bg-primary flex items-center justify-between border-b-[3px] border-black px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-wider uppercase">Quest Details</span>
            {isComplete && (
              <Badge variant="success" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-success h-2.5 w-2.5 border border-black" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="relative p-6">
          <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">{ws.name}</h1>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">{ws.description}</p>
            </div>
            <div className="flex flex-shrink-0 gap-3">
              <Button variant="outline" size="sm" className="shimmer-on-hover">
                <UserPlus className="h-4 w-4" />
                Add Enrollee
              </Button>
              <Button size="sm" className="shimmer-on-hover">
                <Plus className="h-4 w-4" />
                Add Milestone
              </Button>
              <ShareButton
          questId={workspaceId}
          questName={ws.name}
          onToast={addToast}
        />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div ref={statsRef} className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`h-10 w-10 ${stat.bg} flex flex-shrink-0 items-center justify-center border-[2px] border-black shadow-[2px_2px_0_#000]`}
                >
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold">{stat.label}</p>
                  <p className="text-lg font-black tabular-nums">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Progress section */}
      {milestones.length > 0 && (
        <div className="animate-fade-in-up stagger-3 mb-8">
          <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_#000]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black">Overall Progress</span>
              <div className="flex items-center gap-3">
                {earnedReward > 0 && (
                  <span className="text-xs font-bold text-green-700">
                    +{formatTokens(earnedReward)} USDC earned
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
      <div className="mb-6 flex gap-0 border-b-[3px] border-black" ref={contentRef}>
        {(["milestones", "enrollees"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-[3px] cursor-pointer border-[3px] border-b-0 px-6 py-3 text-sm font-black tracking-wider capitalize uppercase transition-all ${
              activeTab === tab
                ? "bg-primary border-black shadow-[2px_-2px_0_#000]"
                : "hover:bg-secondary border-transparent"
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
                <div className="bg-primary mb-4 flex h-14 w-14 items-center justify-center border-[3px] border-black shadow-[4px_4px_0_#000]">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">No milestones yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">
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
              const isCompleted = completions.some(c => c.milestoneId === ms.id && c.completed)
              const completedBy = completions
                .filter(c => c.milestoneId === ms.id && c.completed)
                .map(c => c.enrollee)
              const isExpanded = expandedMilestone === ms.id

              return (
                <div
                  key={ms.id}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <Card
                    className={`neo-lift group cursor-pointer transition-all hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] ${
                      isCompleted ? "border-success" : ""
                    }`}
                    onClick={() => setExpandedMilestone(isExpanded ? null : ms.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center border-[2px] border-black shadow-[2px_2px_0_#000] transition-all duration-300 ${
                            isCompleted ? "bg-success" : "group-hover:bg-secondary bg-white"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="text-muted-foreground h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3
                              className={`font-black ${isCompleted ? "text-muted-foreground" : ""}`}
                            >
                              {ms.title}
                            </h3>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              <Badge variant={isCompleted ? "success" : "default"}>
                                {ms.rewardAmount} USDC
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="text-muted-foreground h-4 w-4" />
                              ) : (
                                <ChevronDown className="text-muted-foreground h-4 w-4" />
                              )}
                            </div>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="animate-fade-in-up mt-3">
                              <p className="text-muted-foreground mb-3 text-sm">{ms.description}</p>
                              {completedBy.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-muted-foreground mb-2 text-xs font-bold">
                                    Completed by:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {completedBy.map(addr => (
                                      <span
                                        key={addr}
                                        className="bg-success/10 border-[1.5px] border-black px-2 py-1 font-mono text-xs font-bold shadow-[1px_1px_0_#000]"
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
                                  onClick={e => e.stopPropagation()}
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
                <div className="bg-primary mb-4 flex h-14 w-14 items-center justify-center border-[3px] border-black shadow-[4px_4px_0_#000]">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">No enrollees yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">Add learners to this quest.</p>
                <Button size="sm" className="shimmer-on-hover">
                  <UserPlus className="h-4 w-4" />
                  Add Enrollee
                </Button>
              </CardContent>
            </Card>
          ) : (
            enrollees.map((addr, i) => {
              const completed = completions.filter(c => c.enrollee === addr && c.completed).length
              const earned = milestones
                .filter(m =>
                  completions.some(
                    c => c.enrollee === addr && c.milestoneId === m.id && c.completed
                  )
                )
                .reduce((sum, m) => sum + m.rewardAmount, 0)
              const isAllDone = completed === milestones.length && milestones.length > 0

              return (
                <div
                  key={addr}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <Card className="neo-lift group hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary flex h-10 w-10 items-center justify-center border-[2px] border-black font-mono text-sm font-black shadow-[2px_2px_0_#000] transition-shadow group-hover:shadow-[3px_3px_0_#000]">
                            {addr.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-bold">{addr}</p>
                              {isAllDone && <Sparkles className="text-primary h-3.5 w-3.5" />}
                            </div>
                            <p className="text-muted-foreground text-xs font-bold">
                              {completed}/{milestones.length} milestones
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="success" className="tabular-nums">
                            +{formatTokens(earned)} USDC
                          </Badge>
                          <p className="text-muted-foreground mt-1 text-xs font-bold">earned</p>
                        </div>
                      </div>
                      {milestones.length > 0 && (
                        <Progress value={completed} max={milestones.length} className="mt-4" />
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })
          )}
        </div>
      )}
       <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
