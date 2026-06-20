import { Plus, Target, CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTokens } from "@/lib/utils"
import type { MilestoneInfo } from "@/lib/contracts/milestone"

interface QuestMilestonesProps {
  milestones: MilestoneInfo[]
  completions: number
  isOwner: boolean
  expandedMilestone: number | null
  setExpandedMilestone: (id: number | null) => void
  onAddMilestone: () => void
  onVerify: (id: number) => void
}

export function QuestMilestones({
  milestones,
  completions,
  isOwner,
  expandedMilestone,
  setExpandedMilestone,
  onAddMilestone,
  onVerify,
}: QuestMilestonesProps) {
  return (
    <div className="space-y-4">
      {milestones.length === 0 ? (
        <Card className="animate-fade-in-up border-border bg-secondary/5 border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="bg-accent border-border mb-6 flex h-16 w-16 items-center justify-center border shadow-lg">
              <Target className="h-8 w-8 text-black" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">No learning goals defined</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Define the steps required to complete this quest and start incentivizing learners.
            </p>
            {isOwner && (
              <Button onClick={onAddMilestone} size="lg" className="shimmer-on-hover px-10">
                <Plus className="h-5 w-5" />
                Add First Milestone
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        milestones.map((ms, i) => {
          const done = completions > i
          const isExpanded = expandedMilestone === i

          return (
            <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <Card
                className={`neo-lift group border-border cursor-pointer overflow-hidden border-2 bg-white transition-all hover:shadow-lg active:shadow-sm ${
                  done ? "bg-success/5" : ""
                } ${isExpanded ? "shadow-md" : ""}`}
                onClick={() => setExpandedMilestone(isExpanded ? null : i)}
              >
                <div
                  className={`h-1.5 w-full bg-black/10 transition-colors ${done ? "bg-success" : ""}`}
                />
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div
                      className={`border-border flex h-10 w-10 flex-shrink-0 items-center justify-center border shadow-md transition-all duration-300 ${
                        done ? "bg-success" : "group-hover:bg-secondary bg-white"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="text-muted-foreground h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                              Milestone {i + 1}
                            </span>
                            {done && (
                              <Badge
                                variant="success"
                                className="h-4 gap-0.5 p-1 px-1.5 text-[8px]"
                              >
                                <Sparkles className="h-2 w-2" />
                                Earned
                              </Badge>
                            )}
                          </div>
                          <h3
                            className={`text-lg font-semibold ${done ? "text-muted-foreground" : "text-foreground"}`}
                          >
                            {ms.title}
                          </h3>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <Badge
                            variant={done ? "success" : "default"}
                            className={`border-border h-7 border-2 px-3 text-xs font-semibold shadow-sm ${done ? "" : "bg-accent text-black"}`}
                          >
                            {formatTokens(Number(ms.rewardAmount))} USDC
                          </Badge>
                          <div
                            className={`border-border bg-secondary group-hover:bg-accent flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-sm transition-colors`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="animate-scale-in border-border/10 mt-5 border-t-2 border-dashed pt-4">
                          <p className="text-muted-foreground mb-6 text-sm leading-relaxed sm:text-base">
                            {ms.description}
                          </p>

                          {isOwner && !done && (
                            <div className="flex gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="shimmer-on-hover border-border text-xs font-semibold tracking-widest uppercase"
                                onClick={e => {
                                  e.stopPropagation()
                                  onVerify(i)
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Verify Completion
                              </Button>
                            </div>
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
  )
}
