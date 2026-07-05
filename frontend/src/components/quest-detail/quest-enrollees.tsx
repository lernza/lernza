 
import { Users, UserPlus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useInView } from "@/hooks/use-animations"
import { formatTokens } from "@/lib/utils"

interface Milestone {
  id: number
  rewardAmount: number
}

interface Completion {
  milestoneId: number
  enrollee: string
  completed: boolean
}

interface QuestEnrolleesProps {
  enrollees: string[]
  milestones: Milestone[]
  completions: Completion[]
  onAddEnrollee: () => void
}

export function QuestEnrollees({
  enrollees,
  milestones,
  completions,
  onAddEnrollee,
}: QuestEnrolleesProps) {
  const [contentRef, contentInView] = useInView()

  if (enrollees.length === 0) {
    return (
      <Card className="animate-fade-in-up">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="bg-accent border-border mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mb-2 font-semibold">No enrollees yet</h3>
          <p className="text-muted-foreground mb-4 text-sm">Add learners to this quest.</p>
          <Button size="sm" className="shimmer-on-hover" onClick={onAddEnrollee}>
            <UserPlus className="h-4 w-4" />
            Add Enrollee
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" ref={contentRef}>
      {enrollees.map((addr, i) => {
        const completedCount = completions.filter(c => c.enrollee === addr && c.completed).length
        const earned = milestones
          .filter(m =>
            completions.some(
              c => c.enrollee === addr && c.milestoneId === m.id && c.completed
            )
          )
          .reduce((sum, m) => sum + m.rewardAmount, 0)
        const isAllDone = completedCount === milestones.length && milestones.length > 0

        return (
          <div
            key={addr}
            className={`reveal-up ${contentInView ? "in-view" : ""}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <Card className="neo-lift group hover:shadow-lg active:shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent border-border flex h-10 w-10 items-center justify-center border font-mono text-sm font-semibold shadow-sm transition-shadow group-hover:shadow-md">
                      {addr.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-bold">{addr}</p>
                        {isAllDone && <Sparkles className="text-accent h-3.5 w-3.5" />}
                      </div>
                      <p className="text-muted-foreground text-xs font-bold">
                        {completedCount}/{milestones.length} milestones
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
                  <Progress value={completedCount} max={milestones.length} className="mt-4" />
                )}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
