import { SectionErrorBoundary } from "@/components/error-boundary"
import { QuestHeaderPanel } from "@/components/quest/QuestHeaderPanel"
import { StatsPanel } from "@/components/quest/StatsPanel"
import { ProgressPanel } from "@/components/quest/ProgressPanel"

export interface QuestPanelsProps {
  questId: number
  questName: string
  questDescription: string
  isComplete: boolean
  isArchived: boolean
  isSuspended?: boolean
  onBack: () => void
  onAddEnrollee: () => void
  onAddMilestone: () => void
  onTransferOwnership: (() => void) | undefined
  isEnrollDisabled?: boolean
  enrollDisabledReason?: string
  onToast: (message: string, type: "success" | "error" | "info" | "warning") => void
  enrolleesCount: number
  milestonesCount: number
  poolBalance: number
  reservedReward: number
  totalReward: number
  completedMilestones: number
  earnedReward: number
}

/** Quest header, aggregate stats, and the progress bar. */
export function QuestPanels(props: QuestPanelsProps) {
  return (
    <>
      <SectionErrorBoundary label="Quest header">
        <QuestHeaderPanel
          questId={props.questId}
          questName={props.questName}
          questDescription={props.questDescription}
          isComplete={props.isComplete}
          isArchived={props.isArchived}
          isSuspended={props.isSuspended}
          onBack={props.onBack}
          onAddEnrollee={props.onAddEnrollee}
          onAddMilestone={props.onAddMilestone}
          onTransferOwnership={props.onTransferOwnership}
          isEnrollDisabled={props.isEnrollDisabled}
          enrollDisabledReason={props.enrollDisabledReason}
          onToast={props.onToast}
        />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="Quest stats">
        <StatsPanel
          enrolleesCount={props.enrolleesCount}
          milestonesCount={props.milestonesCount}
          poolBalance={props.poolBalance}
          reservedReward={props.reservedReward}
          totalReward={props.totalReward}
        />

        <ProgressPanel
          completedMilestones={props.completedMilestones}
          totalMilestones={milestones.length}
          earnedReward={props.earnedReward}
        />
      </SectionErrorBoundary>
    </>
  )
}
