import { useMemo, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"
import {
  useQuest,
  useMilestones,
  useEnrollees,
  useRewardPool,
  useTotalReservedReward,
} from "@/hooks/use-quest-data"
import { PageMetadata } from "@/components/PageMetadata"
import { buildQuestMetadata } from "@/lib/questMetadata"
import { QuestStatus, type QuestInfo } from "@/lib/contract-types"
import { TabsNavigation, type QuestTab } from "@/components/quest/TabsNavigation"
import { TimelineSection } from "@/components/quest/TimelineSection"
import { ReferralCard } from "@/components/referral/ReferralCard"
import { Button } from "@/components/ui/button"
import { SectionErrorBoundary } from "@/components/error-boundary"
import { LoadingState } from "@/components/ui/async-states"
import { useReferralCapture } from "./quest/use-referral-capture"
import { useQuestCompletions } from "./quest/use-quest-completions"
import { useMilestoneStats } from "./quest/use-milestone-stats"
import { useQuestDisputes } from "./quest/use-quest-disputes"
import { useQuestClaims } from "./quest/use-quest-claims"
import { useEnrolleeActions } from "./quest/use-enrollee-actions"
import { QuestPanels } from "./quest/quest-panels"
import { QuestMilestonesTab } from "./quest/quest-milestones-tab"
import { QuestEnrolleesTab } from "./quest/quest-enrollees-tab"
import { QuestAnalyticsTab } from "./quest/quest-analytics-tab"
import { QuestDialogs } from "./quest/quest-dialogs"

interface QuestViewProps {
  questId: number
  onBack: () => void
}

/**
 * Quest detail page. Owns tab selection and dialog visibility; on-chain data
 * loading and the individual sections live in `./quest/`.
 */
export function QuestView({ questId, onBack }: QuestViewProps) {
  const [activeTab, setActiveTab] = useState<QuestTab>("milestones")
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const { addToast } = useToast()
  const { address } = useWallet()

  useReferralCapture(questId)

  const { data: quest, isLoading: questLoading, error: questError } = useQuest(questId)
  
  const { data: prerequisitesMet = true, isLoading: prerequisitesLoading } = useQuery({
    queryKey: ["prerequisitesMet", quest?.id, address],
    queryFn: async () => {
      if (!address || !quest?.prerequisiteQuestIds?.length) return true
      for (const reqId of quest.prerequisiteQuestIds) {
        const reqMilestones = await milestoneClient.listMilestones(reqId)
        if (reqMilestones.length === 0) return false
        const reqCompletions = await milestoneClient.getEnrolleeCompletions(reqId, address)
        const allCompleted = reqMilestones.every((_, i) => reqCompletions[i])
        if (!allCompleted) return false
      }
      return true
    },
    enabled: !!address && !!quest?.prerequisiteQuestIds?.length,
  })

  const {
    data: milestonesData,
    isLoading: milestonesLoading,
    error: milestonesError,
  } = useMilestones(questId)
  const {
    data: enrolleesData,
    isLoading: enrolleesLoading,
    error: enrolleesError,
  } = useEnrollees(questId)
  const { data: poolBalance = 0n } = useRewardPool(questId)
  const { data: reservedReward = 0n } = useTotalReservedReward(questId)

  const milestones = milestonesData ?? []
  const enrolleeAddresses = enrolleesData ?? []

  const { completions } = useQuestCompletions({ questId, enrolleeAddresses, milestones })
  const { totalReward, completedMilestones, isComplete, earnedReward } = useMilestoneStats(
    milestones,
    completions
  )

  const {
    enrolleeToRemove,
    setEnrolleeToRemove,
    handleAddEnrollee,
    handleAddMilestone,
    handleVerifyCompletion,
    handleRemoveEnrollee,
    confirmRemoveEnrollee,
  } = useEnrolleeActions({ questId, address, quest, addToast })

  const disputes = useQuestDisputes({ questId, address, quest, milestones, addToast })
  const claims = useQuestClaims({ questId, addToast })

  const enrollees = useMemo(
    () => enrolleeAddresses.map((addr, index) => ({ id: index, address: addr })),
    [enrolleeAddresses]
  )

  const isLoading = questLoading || milestonesLoading || enrolleesLoading
  const error = questError || milestonesError || enrolleesError

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <PageMetadata {...questPageMeta(questId)} />
        <LoadingState message="Loading quest data from chain..." />
      </div>
    )
  }

  if (error || !quest) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="mb-4 text-2xl font-semibold">{error || "Quest not found"}</h2>
        <Button variant="outline" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  }

  // Map milestones to the shape expected by section components
  const mappedMilestones = milestones.map(m => ({
    id: m.id,
    questId: m.questId,
    title: m.title,
    description: m.description,
    rewardAmount: Number(m.rewardAmount),
    prerequisiteIds: m.prerequisiteIds,
    deadline: m.deadline,
  }))

  const { isQuestOwner } = disputes

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />
      <PageMetadata {...questPageMeta(questId, quest.name, quest.description)} />

      <QuestPanels
        questId={questId}
        questName={quest.name}
        questDescription={quest.description}
        isComplete={isComplete}
        isArchived={quest.status === QuestStatus.Archived || quest.status === QuestStatus.Cancelled}
        isSuspended={quest.status === QuestStatus.Suspended}
        isEnrollDisabled={!prerequisitesMet}
        enrollDisabledReason={!prerequisitesMet ? "You must complete prerequisite quests before enrolling." : undefined}
        onBack={onBack}
        onAddEnrollee={handleAddEnrollee}
        onAddMilestone={handleAddMilestone}
        onTransferOwnership={
          isQuestOwner ? () => setIsTransferDialogOpen(true) : undefined
        }
        onToast={addToast}
        enrolleesCount={enrollees.length}
        milestonesCount={milestones.length}
        poolBalance={Number(poolBalance)}
        reservedReward={Number(reservedReward)}
        totalReward={totalReward}
        completedMilestones={completedMilestones}
        earnedReward={earnedReward}
      />

      <TabsNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        milestonesCount={milestones.length}
        enrolleesCount={enrollees.length}
        showAnalytics={true}
        showReferrals={true}
      />

      {activeTab === "milestones" && (
        <QuestMilestonesTab
          questId={questId}
          mappedMilestones={mappedMilestones}
          completions={completions}
          enrollees={enrollees}
          onAddMilestone={handleAddMilestone}
          onVerifyCompletion={handleVerifyCompletion}
          disputeStates={disputes.disputeStates}
          ownerDisputes={disputes.ownerDisputes}
          canResolveDisputes={isQuestOwner}
          onOpenDispute={isQuestOwner ? undefined : disputes.handleOpenDispute}
          onResolveDispute={isQuestOwner ? disputes.handleResolveDispute : undefined}
          isDisputePending={disputes.isDisputePending}
        />
      )}

      {activeTab === "enrollees" && (
        <QuestEnrolleesTab
          enrollees={enrollees}
          mappedMilestones={mappedMilestones}
          completions={completions}
          onAddEnrollee={handleAddEnrollee}
          onClaimRewards={claims.handleClaimRewards}
          isClaiming={claims.isClaiming}
          onRemoveEnrollee={isQuestOwner ? handleRemoveEnrollee : undefined}
        />
      )}

      {activeTab === "timeline" && (
        <SectionErrorBoundary label="Timeline">
          <TimelineSection questId={questId} />
        </SectionErrorBoundary>
      )}

      {activeTab === "referrals" && (
        <SectionErrorBoundary label="Refer & Earn">
          <div className="mx-auto max-w-xl py-4">
            <ReferralCard
              questId={questId}
              questTitle={quest.name}
              userAddress={address}
              onRewardClaimed={amt => addToast(`Claimed ${amt} referral bonus tokens!`, "success")}
            />
          </div>
        </SectionErrorBoundary>
      )}

      {activeTab === "analytics" && (
        <QuestAnalyticsTab
          questId={questId}
          questTitle={quest.name}
          createdAt={quest.createdAt}
          enrollees={enrollees}
          completions={completions}
          milestoneCount={milestones.length}
          totalDistributedTokens={Number(reservedReward)}
          poolRemaining={Number(poolBalance)}
        />
      )}

      <div className="mt-8 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Report this quest"
          onClick={() => setIsReportOpen(true)}
        >
          Report this quest
        </Button>
      </div>

      {quest && <PageMetadata {...buildQuestMetadata(quest as unknown as QuestInfo, questId)} />}
      {/* No ToastContainer here: `App.tsx` already renders a single app-level
          container. A second one produced duplicate containers competing over
          the same toast state. */}

      <QuestDialogs
        questId={questId}
        questName={quest.name}
        currentOwner={quest.owner}
        isQuestOwner={isQuestOwner}
        isClaimDialogOpen={claims.isClaimDialogOpen}
        claimSummary={claims.claimSummary}
        onCloseClaimDialog={claims.handleCloseClaimDialog}
        onRetryFailed={claims.handleRetryFailed}
        isRetrying={claims.isRetrying}
        isReportOpen={isReportOpen}
        onCloseReport={() => setIsReportOpen(false)}
        enrolleeToRemove={enrolleeToRemove}
        onCancelRemoveEnrollee={() => setEnrolleeToRemove(null)}
        onConfirmRemoveEnrollee={confirmRemoveEnrollee}
        isTransferDialogOpen={isTransferDialogOpen}
        onCloseTransfer={() => setIsTransferDialogOpen(false)}
      />
    </div>
  )
}
