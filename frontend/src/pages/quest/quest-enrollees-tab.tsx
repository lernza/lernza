import { SectionErrorBoundary } from "@/components/error-boundary"
import { EnrolleesSection } from "@/components/quest/EnrolleesSection"
import type { MappedMilestone } from "./quest-milestones-tab"

export interface QuestEnrolleesTabProps {
  enrollees: { id: number; address: string }[]
  mappedMilestones: MappedMilestone[]
  completions: { milestoneId: number; enrollee: string; completed: boolean }[]
  onAddEnrollee: () => void
  onClaimRewards: (
    enrollee: { id: number; address: string },
    claimableMilestones: { id: number; title: string; rewardAmount: number }[]
  ) => Promise<void>
  isClaiming: boolean
  /** Only owners can remove a learner, so this is undefined otherwise. */
  onRemoveEnrollee: ((enrollee: { address: string }) => void) | undefined
}

/** "Enrollees" tab: learner roster with per-learner reward claiming. */
export function QuestEnrolleesTab({
  enrollees,
  mappedMilestones,
  completions,
  onAddEnrollee,
  onClaimRewards,
  isClaiming,
  onRemoveEnrollee,
}: QuestEnrolleesTabProps) {
  return (
    <SectionErrorBoundary label="Enrollees">
      <EnrolleesSection
        enrollees={enrollees}
        milestones={mappedMilestones}
        completions={completions}
        onAddEnrollee={onAddEnrollee}
        onClaimRewards={onClaimRewards}
        isClaiming={isClaiming}
        onRemoveEnrollee={onRemoveEnrollee}
      />
    </SectionErrorBoundary>
  )
}
