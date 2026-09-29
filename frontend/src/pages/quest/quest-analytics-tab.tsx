import { SectionErrorBoundary } from "@/components/error-boundary"
import { QuestAnalyticsDashboard } from "@/components/analytics/QuestAnalyticsDashboard"

export interface QuestAnalyticsTabProps {
  questId: number
  questTitle: string
  createdAt: number
  enrollees: { id: number; address: string }[]
  completions: { milestoneId: number; enrollee: string; completed: boolean }[]
  milestoneCount: number
  totalDistributedTokens: number
  poolRemaining: number
}

/**
 * "Analytics" tab. Buckets learners into completed / in-progress / stalled
 * from the completion map.
 */
export function QuestAnalyticsTab(props: QuestAnalyticsTabProps) {
  const { enrollees, completions, milestoneCount } = props

  const completedFor = (address: string) =>
    completions.filter(c => c.enrollee === address && c.completed).length

  return (
        <SectionErrorBoundary label="Quest Analytics">
          <QuestAnalyticsDashboard
            questId={props.questId}
            questTitle={props.questTitle}
            createdAt={props.createdAt}
            totalEnrollees={enrollees.length}
            completedLearners={
              enrollees.filter(
                e => completedFor(e.address) === milestoneCount && milestoneCount > 0
              ).length
            }
            inProgressLearners={
              enrollees.filter(
                e => completedFor(e.address) > 0 && completedFor(e.address) < milestoneCount
              ).length
            }
            stalledLearners={enrollees.filter(e => completedFor(e.address) === 0).length}
            totalDistributedTokens={props.totalDistributedTokens}
            poolRemaining={props.poolRemaining}
          />
        </SectionErrorBoundary>
  )
}
