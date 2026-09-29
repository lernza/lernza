import { SectionErrorBoundary } from "@/components/error-boundary"
import {
  MilestonesSection,
  type MilestoneDisputeState,
  type OwnerDispute,
} from "@/components/quest/MilestonesSection"
import type { DisputeOutcome } from "@/lib/contracts/milestone-client"

export interface MappedMilestone {
  id: number
  questId: number
  title: string
  description: string
  rewardAmount: number
  prerequisiteIds: number[]
  deadline: number
}

export interface QuestMilestonesTabProps {
  questId: number
  mappedMilestones: MappedMilestone[]
  completions: { milestoneId: number; enrollee: string; completed: boolean }[]
  enrollees: { id: number; address: string }[]
  onAddMilestone: () => void
  onVerifyCompletion: (milestoneId: number) => void
  disputeStates: Map<number, MilestoneDisputeState>
  ownerDisputes: OwnerDispute[]
  /** True when the viewer owns the quest, unlocking the resolve affordance. */
  canResolveDisputes: boolean
  /** Undefined for owners: learners open disputes, owners resolve them. */
  onOpenDispute: ((milestoneId: number, reason: string) => Promise<void>) | undefined
  onResolveDispute:
    | ((
        milestoneId: number,
        enrollee: string,
        outcome: DisputeOutcome,
        note?: string
      ) => Promise<void>)
    | undefined
  isDisputePending: boolean
}

/** "Milestones" tab: milestone list with submission, verification and disputes. */
export function QuestMilestonesTab({
  questId,
  mappedMilestones,
  completions,
  enrollees,
  onAddMilestone,
  onVerifyCompletion,
  disputeStates,
  ownerDisputes,
  canResolveDisputes,
  onOpenDispute,
  onResolveDispute,
  isDisputePending,
}: QuestMilestonesTabProps) {
  return (
    <SectionErrorBoundary label="Milestones">
      <MilestonesSection
        milestones={mappedMilestones}
        completions={completions}
        enrollees={enrollees}
        questId={questId}
        onAddMilestone={onAddMilestone}
        onVerifyCompletion={onVerifyCompletion}
        disputeStates={disputeStates}
        ownerDisputes={ownerDisputes}
        canResolveDisputes={canResolveDisputes}
        onOpenDispute={onOpenDispute}
        onResolveDispute={onResolveDispute}
        isDisputePending={isDisputePending}
      />
    </SectionErrorBoundary>
  )
}
