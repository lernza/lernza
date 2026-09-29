import { useState } from "react"
import { CheckCircle2, Circle, Clock, Coins, Lock, Plus, Gavel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, formatDeadlineLabel, isExpiredDeadline, isExpiringSoon } from "@/lib/utils"
import { useNow } from "@/hooks/use-now"
import { useTranslation } from "@/i18n"
import { useTokenSymbol } from "@/hooks/use-token-symbol"
import { MilestoneSubmitDialog, type SubmissionEvidence } from "./MilestoneSubmitDialog"
import { OpenDisputeDialog, ResolveDisputeDialog } from "./DisputeDialog"
import type { DisputeOutcome, DisputeStatus } from "@/lib/contracts/milestone-client"

interface Milestone {
  id: number
  title: string
  description?: string
  rewardAmount: number
  prerequisiteIds?: number[]
  /** Optional per-milestone submission deadline (unix seconds) — see #1652. */
  deadline?: number
}

/** Live countdown badge for a milestone's own deadline, if it has one. */
function MilestoneCountdown({ deadline }: { deadline: number }) {
  // Ticking clock so the label is re-derived from the real time after the tab
  // has been in the background (issue #1335).
  const nowMs = useNow()
  const label = formatDeadlineLabel(deadline, nowMs)

  const expired = isExpiredDeadline(deadline, nowMs)
  const soon = !expired && isExpiringSoon(deadline, nowMs)

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-semibold",
        expired ? "text-destructive" : soon ? "text-warning" : "text-muted-foreground"
      )}
    >
      <Clock className="h-3 w-3" /> {label}
    </span>
  )
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

/** Per-milestone dispute state for the milestone the viewer is disputing. */
export interface MilestoneDisputeState {
  status: DisputeStatus
  /** The learner's justification, surfaced to whoever rules on the dispute. */
  reason: string
  /** Seconds until another dispute may be opened, or 0. */
  cooldownSeconds?: number
}

/** An open dispute awaiting the quest owner's ruling. */
export interface OwnerDispute {
  milestoneId: number
  /** The disputing learner, who must be passed back when resolving. */
  enrollee: string
  reason: string
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
  /**
   * Dispute state for the viewing learner, keyed by milestone id. Enables the
   * "Dispute" affordance for submissions awaiting review. See issue #1614.
   */
  disputeStates?: Map<number, MilestoneDisputeState>
  /** Open disputes on this quest, when the connected wallet owns it. */
  ownerDisputes?: OwnerDispute[]
  /** Set when the connected wallet may rule on open disputes (quest owner). */
  canResolveDisputes?: boolean
  onOpenDispute?: (milestoneId: number, reason: string) => void
  onResolveDispute?: (milestoneId: number, enrollee: string, outcome: DisputeOutcome, note?: string) => void
  /** Set to true while a dispute transaction is in flight. */
  isDisputePending?: boolean
}

export function MilestonesSection({
  milestones,
  completions,
  onAddMilestone,
  onVerifyCompletion,
  isVerifying = false,
  disputeStates,
  ownerDisputes,
  canResolveDisputes = false,
  onOpenDispute,
  onResolveDispute,
  isDisputePending = false,
}: MilestonesSectionProps) {
  const { t } = useTranslation()
  const { symbol } = useTokenSymbol()
  const completedSet = new Set(completions.filter(c => c.completed).map(c => c.milestoneId))
  const evidenceMap = new Map(
    completions.filter(c => c.evidence).map(c => [c.milestoneId, c.evidence!])
  )

  const [dialogMilestone, setDialogMilestone] = useState<Milestone | null>(null)
  const [disputeMilestone, setDisputeMilestone] = useState<Milestone | null>(null)
  const [resolvingMilestone, setResolvingMilestone] = useState<Milestone | null>(null)
  const [resolverIsAdmin, setResolverIsAdmin] = useState(false)

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
        <p className="text-muted-foreground mb-4">{t("quest.milestone.empty")}</p>
        <Button onClick={onAddMilestone} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("quest.milestone.createFirst")}
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
          const dispute = disputeStates?.get(milestone.id)
          // A dispute can only be opened while a submission is unresolved, so
          // completed and locked milestones never offer the affordance.
          const canDispute = !!onOpenDispute && !isCompleted && !isLocked
          const hasOpenDispute = dispute?.status === 0 || dispute?.status === 3
          // Owners rule on other learners' disputes, keyed off the quest-wide
          // open-dispute list rather than the viewer's own dispute state.
          const ownerDispute = ownerDisputes?.find(d => d.milestoneId === milestone.id)
          const canResolve = canResolveDisputes && !!onResolveDispute && !!ownerDispute

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
                      {t("quest.milestone.requires", {
                        milestones: milestone.prerequisiteIds.map(id => `Milestone ${id + 1}`).join(", ")
                      })}
                    </p>
                  )}

                  {/* Learner justification while the dispute is open (#1614) */}
                  {(ownerDispute?.reason || (hasOpenDispute && dispute?.reason)) && (
                    <p className="bg-muted/50 text-muted-foreground mt-2 px-3 py-2 text-sm italic">
                      “{ownerDispute?.reason || dispute?.reason}”
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
                    {isCompleted
                      ? t("quest.status.completed")
                      : isLocked
                        ? t("quest.status.locked")
                        : t("quest.status.available")}
                  </Badge>
                  {dispute && (
                    <Badge variant={hasOpenDispute ? "outline" : "secondary"} className="gap-1 text-[10px]">
                      {t(
                        hasOpenDispute
                          ? dispute.status === 3
                            ? "quest.dispute.status.escalated"
                            : "quest.dispute.status.pending"
                          : dispute.status === 1
                            ? "quest.dispute.status.upheld"
                            : "quest.dispute.status.overturned"
                      )}
                    </Badge>
                  )}
                  <span className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                    <Coins className="h-3 w-3" /> {milestone.rewardAmount} {symbol}
                  </span>
                  {!isCompleted && milestone.deadline !== undefined && milestone.deadline > 0 && (
                    <MilestoneCountdown deadline={milestone.deadline} />
                  )}
                </div>

                {!isCompleted && !isLocked && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubmitClick(milestone)}
                      disabled={isVerifying}
                    >
                      {t("quest.milestone.submit")}
                    </Button>
                    {canDispute && !hasOpenDispute && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDisputeMilestone(milestone)}
                        disabled={isDisputePending}
                        className="gap-1.5"
                      >
                        <Gavel className="h-3.5 w-3.5" />
                        {t("quest.dispute.appeal")}
                      </Button>
                    )}
                  </div>
                )}

                {canResolve && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDisputePending}
                    onClick={() => {
                      setResolvingMilestone(milestone)
                      setResolverIsAdmin(false)
                    }}
                    className="gap-1.5"
                  >
                    <Gavel className="h-3.5 w-3.5" />
                    {t("quest.dispute.resolveTitle")}
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

      {/* Dispute dialog — learner appeals a rejection (#1614) */}
      {disputeMilestone && onOpenDispute && (
        <OpenDisputeDialog
          open={true}
          milestoneTitle={disputeMilestone.title}
          cooldownSeconds={disputeStates?.get(disputeMilestone.id)?.cooldownSeconds}
          onClose={() => setDisputeMilestone(null)}
          onConfirm={reason => {
            onOpenDispute(disputeMilestone.id, reason)
            setDisputeMilestone(null)
          }}
          isPending={isDisputePending}
        />
      )}

      {/* Resolution dialog — quest owner rules on an open dispute (#1614) */}
      {resolvingMilestone && onResolveDispute && (
        <ResolveDisputeDialog
          open={true}
          milestoneTitle={resolvingMilestone.title}
          disputeReason={
            ownerDisputes?.find(d => d.milestoneId === resolvingMilestone.id)?.reason ?? ""
          }
          canEscalate={resolverIsAdmin}
          onClose={() => setResolvingMilestone(null)}
          onConfirm={(outcome, note) => {
            const target = ownerDisputes?.find(d => d.milestoneId === resolvingMilestone.id)
            if (target) {
              onResolveDispute(resolvingMilestone.id, target.enrollee, outcome, note)
            }
            setResolvingMilestone(null)
          }}
          isPending={isDisputePending}
        />
      )}
    </>
  )
}
