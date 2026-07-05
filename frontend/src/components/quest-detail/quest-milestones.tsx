 
import { useState } from "react"
import { Target, Plus, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useInView } from "@/hooks/use-animations"
import { track } from "@/lib/analytics"

interface Milestone {
  id: number
  title: string
  description: string
  rewardAmount: number
}

interface Completion {
  milestoneId: number
  enrollee: string
  completed: boolean
}

interface QuestMilestonesProps {
  milestones: Milestone[]
  completions: Completion[]
  enrollees: string[]
  questId: number
  onAddMilestone: () => void
  onVerifyCompletion: (milestoneId: number) => void
}

export function QuestMilestones({
  milestones,
  completions,
  enrollees,
  questId,
  onAddMilestone,
  onVerifyCompletion,
}: QuestMilestonesProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null)
  const [contentRef, contentInView] = useInView()

  const toggleExpand = (id: number) => {
    setExpandedMilestone(expandedMilestone === id ? null : id)
  }

  if (milestones.length === 0) {
    return (
      <Card className="animate-fade-in-up">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="bg-accent border-border mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
            <Target className="h-6 w-6" />
          </div>
          <h3 className="mb-2 font-semibold">No milestones yet</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Add milestones to define learning goals.
          </p>
          <Button size="sm" className="shimmer-on-hover" onClick={onAddMilestone}>
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" ref={contentRef}>
      {milestones.map((ms, i) => {
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
              className={`neo-lift group cursor-pointer transition-all hover:shadow-lg active:shadow-sm ${
                isCompleted ? "border-success" : ""
              }`}
              onClick={() => toggleExpand(ms.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`border-border mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center border shadow-sm transition-all duration-300 ${
                      isCompleted ? "bg-success" : "bg-background group-hover:bg-secondary"
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
                        className={`font-semibold ${isCompleted ? "text-muted-foreground" : ""}`}
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
                                  className="bg-success/10 border-border border-[1.5px] px-2 py-1 font-mono text-xs font-bold shadow-sm"
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
                            onClick={e => {
                              e.stopPropagation()
                              track("milestone_verified", {
                                quest_id: questId,
                                milestone_id: ms.id,
                              })
                              onVerifyCompletion(ms.id)
                            }}
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
      })}
    </div>
  )
}
