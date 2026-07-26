import { Users, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Enrollee {
  id: number
  address: string
  name?: string
}

interface Milestone {
  id: number
  title: string
  rewardAmount: number
}

interface Completion {
  milestoneId: number
  completed: boolean
}

interface EnrolleesSectionProps {
  enrollees: Enrollee[]
  milestones: Milestone[]
  completions: Completion[]
  onAddEnrollee: () => void
}

export function EnrolleesSection({
  enrollees,
  milestones,
  completions,
  onAddEnrollee,
}: EnrolleesSectionProps) {
  if (enrollees.length === 0) {
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center border p-12 shadow-md">
        <Users className="text-muted-foreground mb-3 h-8 w-8" />
        <p className="text-muted-foreground mb-4">No enrollees yet</p>
        <Button onClick={onAddEnrollee} className="gap-2">
          <Plus className="h-4 w-4" />
          Add first enrollee
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {enrollees.map(enrollee => {
        const enrolleeCompletions = completions.filter(
          c => c.completed && milestones.some(m => m.id === c.milestoneId)
        )
        const completedCount = enrolleeCompletions.length
        const progressPercent =
          milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0

        return (
          <div
            key={enrollee.id}
            className="border-border bg-card flex flex-col gap-4 border p-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            {/* Enrollee info */}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{enrollee.name || "Unnamed"}</h3>
              <p className="text-muted-foreground mt-1 truncate text-sm font-mono">
                {enrollee.address}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums">
                  {completedCount}/{milestones.length}
                </span>
              </div>
            </div>

            {/* Earned reward */}
            <div className="flex items-center gap-4 sm:justify-end">
              {milestones.length > 0 && (
                <Badge variant="secondary">
                  {milestones
                    .filter((_, i) => i < completedCount)
                    .reduce((sum, m) => sum + m.rewardAmount, 0)}{" "}
                  USDC earned
                </Badge>
              )}
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}

      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={onAddEnrollee} className="gap-2">
          <Plus className="h-4 w-4" />
          Add enrollee
        </Button>
      </div>
    </div>
  )
}
