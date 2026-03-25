import {
  Plus,
  Target,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"
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
        <Card className="animate-fade-in-up border-black border-2 border-dashed bg-secondary/5">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-primary border-[3px] border-black shadow-[6px_6px_0_#000] flex items-center justify-center mb-6">
              <Target className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-xl font-black mb-2">No learning goals defined</h3>
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
            <div
              key={i}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Card
                className={`neo-lift bg-white hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] cursor-pointer group transition-all border-black border-2 overflow-hidden ${
                  done ? "bg-success/5" : ""
                } ${isExpanded ? "shadow-[5px_5px_0_#000]" : ""}`}
                onClick={() => setExpandedMilestone(isExpanded ? null : i)}
              >
                <div className={`h-1.5 w-full bg-black/10 transition-colors ${done ? "bg-success" : ""}`} />
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div
                      className={`w-10 h-10 border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        done ? "bg-success" : "bg-white group-hover:bg-secondary"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Milestone {i + 1}</span>
                             {done && (
                               <Badge variant="success" className="h-4 p-1 px-1.5 text-[8px] gap-0.5">
                                 <Sparkles className="h-2 w-2" />
                                 Earned
                               </Badge>
                             )}
                           </div>
                           <h3 className={`font-black text-lg ${done ? "text-muted-foreground" : "text-foreground"}`}>
                             {ms.title}
                           </h3>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge
                            variant={done ? "success" : "default"}
                            className={`h-7 px-3 border-black border-2 text-xs font-black shadow-[2px_2px_0_#000] ${done ? "" : "bg-primary text-black"}`}
                          >
                           {formatTokens(Number(ms.rewardAmount))} USDC
                          </Badge>
                          <div className={`w-8 h-8 rounded-full border-black border-2 flex items-center justify-center bg-secondary shadow-[2px_2px_0_#000] group-hover:bg-primary transition-colors`}>
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
                        <div className="mt-5 animate-scale-in pt-4 border-t-2 border-dashed border-black/10">
                          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
                            {ms.description}
                          </p>
                          
                          {isOwner && !done && (
                            <div className="flex gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="shimmer-on-hover border-black font-black uppercase tracking-widest text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onVerify(i)
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
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
