import { useState } from "react"
import { CheckCircle2, Circle, Coins, Lock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MilestoneSubmitDialog, type SubmissionEvidence } from "./MilestoneSubmitDialog"

interface Milestone {
  id: number
  title: string
  description?: string
  rewardAmount: number
  prerequisiteIds?: number[]
}

interface Completion {
  milestoneId: number
  completed: boolean
  /** Evidence provided by the learner at submission time (issue #1448). */
  evidence?: SubmissionEvidence
}

interface Enrollee {
  id: number
  address: string
  name?: string
}

interface MilestonesSectionProps {
  milestones: Milestone[]
  completions: Completion[]
  enrollees: Enrollee[]
  questId: number
  onAddMilestone: () => void
  /**
   * Called when a learner submits a milestone with optional evidence.
   * Evidence contains the URL and written note the learner provided.
   * Resolves issue #1448.
   */
  onVerifyCompletion: (milestoneId: number, evidence: SubmissionEvidence) => void
  /** Set to true while the verify transaction is in flight. */
  isVerifying?: boolean
}

export function MilestonesSection({
  milestones,
  completions,
  onAddMilestone,
  onVerifyCompletion,
  isVerifying = false,
}: MilestonesSectionProps) {
  const completedSet = new Set(completions.filter(c => c.completed).map(c => c.milestoneId))
  const evidenceMap = new Map(
    completions.filter(c => c.evidence).map(c => [c.milestoneId, c.evidence!])
  )

  const [dialogMilestone, setDialogMilestone] = useState<Milestone | null>(null)

  function handleSubmitClick(milestone: Milestone) {
    setDialogMilestone(milestone)
  }

  function handleConfirmEvidence(evidence: SubmissionEvidence) {
    if (dialogMilestone) {
      onVerifyCompletion(dialogMilestone.id, evidence)
    }
    setDialogMilestone(null)
  }

  function handleCancelDialog() {
    setDialogMilestone(null)
  }

  if (milestones.length === 0) {
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center border p-12 shadow-md">
        <Circle className="text-muted-foreground mb-3 h-8 w-8" />
        <p className="text-muted-foreground mb-4">No milestones yet</p>
        <Button onClick={onAddMilestone} className="gap-2">
          <Plus className="h-4 w-4" />
          Create first milestone
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {milestones.map((milestone, index) => {
          const isCompleted = completedSet.has(milestone.id)
          const isLocked = milestone.prerequisiteIds?.some(id => !completedSet.has(id)) ?? false
          const evidence = evidenceMap.get(milestone.id)

          return (
            <div
              key={milestone.id}
              className={cn(
                "border-border bg-card flex flex-col gap-4 border p-5 shadow-md transition-all sm:flex-row sm:items-start",
                isCompleted && "bg-success/5 border-success/30",
                isLocked && "opacity-60"
              )}
            >
              {/* Checkpoint icon and title */}
              <div className="flex flex-1 items-start gap-4">
                <div
                  className={cn(
                    "border-border flex h-8 w-8 flex-shrink-0 items-center justify-center border",
                    isCompleted ? "bg-success" : isLocked ? "bg-muted" : "bg-accent"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : isLocked ? (
                    <Lock className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className={cn("text-base font-semibold", isCompleted && "line-through")}>
                    {milestone.title}
                  </h3>
                  {milestone.description && (
                    <p className="text-muted-foreground mt-1 text-sm">{milestone.description}</p>
                  )}
                  {milestone.prerequisiteIds && milestone.prerequisiteIds.length > 0 && (
                    <p className="text-muted-foreground mt-2 text-xs font-semibold">
                      Requires: {milestone.prerequisiteIds.map(id => `Milestone ${id + 1}`).join(", ")}
                    </p>
                  )}

                  {/* Learner evidence — visible to owners/reviewers after submission (#1448) */}
                  {isCompleted && evidence && (
                    <div className="mt-2 space-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm">
                      {evidence.url && (
                        <p>
                          <span className="font-medium">Evidence: </span>
                          <a
                            href={evidence.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            {evidence.url}
                          </a>
                        </p>
                      )}
                      {evidence.note && (
                        <p>
                          <span className="font-medium">Note: </span>
                          {evidence.note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Reward badge and action button */}
              <div className="flex items-center gap-3 sm:justify-end">
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant={isCompleted ? "success" : isLocked ? "secondary" : "default"}
                    className="gap-1.5"
                  >
                    {isCompleted ? "Completed" : isLocked ? "Locked" : "Available"}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                    <Coins className="h-3 w-3" /> {milestone.rewardAmount} USDC
                  </span>
                </div>

                {!isCompleted && !isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmitClick(milestone)}
                    disabled={isVerifying}
                  >
                    Submit
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onAddMilestone} className="gap-2">
            <Plus className="h-4 w-4" />
            Add milestone
          </Button>
        </div>
      </div>

      {/* Evidence dialog — opens when learner clicks Submit (#1448) */}
      {dialogMilestone && (
        <MilestoneSubmitDialog
          open={true}
          milestoneTitle={dialogMilestone.title}
          onConfirm={handleConfirmEvidence}
          onCancel={handleCancelDialog}
          isPending={isVerifying}
        />
      )}
    </>
  )
}
