// frontend/src/pages/quest.tsx (wired to on-chain data)
import { useState, useMemo, useCallback, useEffect } from "react"
import { ToastContainer } from "@/components/toast"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"
import {
  useQuest,
  useMilestones,
  useEnrollees,
  useRewardPool,
  useTotalReservedReward,
} from "@/hooks/use-quest-data"
import { milestoneClient } from "@/lib/contracts/milestone"
import { PageMetadata } from "@/components/PageMetadata"
import { buildQuestMetadata } from "@/lib/questMetadata"
import type { QuestInfo } from "@/lib/contract-types"
import { QuestHeaderPanel } from "@/components/quest/QuestHeaderPanel"
import { StatsPanel } from "@/components/quest/StatsPanel"
import { ProgressPanel } from "@/components/quest/ProgressPanel"
import { TabsNavigation, type QuestTab } from "@/components/quest/TabsNavigation"
import { MilestonesSection } from "@/components/quest/MilestonesSection"
import { EnrolleesSection } from "@/components/quest/EnrolleesSection"
import { BatchClaimResultDialog } from "@/components/quest/BatchClaimResultDialog"
import { TimelineSection } from "@/components/quest/TimelineSection"
import { QuestAnalyticsDashboard } from "@/components/analytics/QuestAnalyticsDashboard"
import { ReferralCard } from "@/components/referral/ReferralCard"
import { ReportQuestDialog } from "@/components/report-quest-dialog"
import { batchClaimRewards } from "@/lib/contracts/batch-claims"
import { Button } from "@/components/ui/button"
import { SectionErrorBoundary } from "@/components/error-boundary"
import { LoadingState } from "@/components/ui/async-states"
import { storePendingReferral, recordReferralEnrollment } from "@/lib/referrals"
import type { BatchClaimSummary, MilestoneClaimResult } from "@/lib/contract-types"

interface QuestViewProps {
  questId: number
  onBack: () => void
}

export function QuestView({ questId, onBack }: QuestViewProps) {
  const [activeTab, setActiveTab] = useState<QuestTab>("milestones")
  const { toasts, addToast, removeToast } = useToast()
  const { address } = useWallet()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")
      if (ref) {
        storePendingReferral(questId, ref)
      }
    }
  }, [questId])

  const { data: quest, isLoading: questLoading, error: questError } = useQuest(questId)
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

  // Batch claim state
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSummary, setClaimSummary] = useState<BatchClaimSummary | null>(null)
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // Report state
  const [isReportOpen, setIsReportOpen] = useState(false)

  // Fetch completion status for each enrollee x milestone combination
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({})

  // Load completions when enrollees or milestones change
  useEffect(() => {
    if (enrolleeAddresses.length === 0 || milestones.length === 0) {
      setCompletionMap({})
      return
    }

    let cancelled = false

    const loadCompletions = async () => {
      try {
        const entries: [string, boolean][] = []
        for (const enrollee of enrolleeAddresses) {
          for (const milestone of milestones) {
            const completed = await milestoneClient.isCompleted(questId, milestone.id, enrollee)
            entries.push([`${enrollee}-${milestone.id}`, completed])
          }
        }
        if (!cancelled) {
          setCompletionMap(Object.fromEntries(entries))
        }
      } catch {
        // Silently handle — completions will show as incomplete
      }
    }

    void loadCompletions()
    return () => {
      cancelled = true
    }
  }, [questId, enrolleeAddresses, milestones])

  // Build enrollees list for sections
  const enrollees = useMemo(
    () => enrolleeAddresses.map((addr, index) => ({ id: index, address: addr })),
    [enrolleeAddresses]
  )

  // Build completions array from the map for section components
  const completions = useMemo(() => {
    const result: { milestoneId: number; enrollee: string; completed: boolean }[] = []
    for (const enrollee of enrolleeAddresses) {
      for (const milestone of milestones) {
        const key = `${enrollee}-${milestone.id}`
        if (completionMap[key]) {
          result.push({ milestoneId: milestone.id, enrollee, completed: true })
        }
      }
    }
    return result
  }, [enrolleeAddresses, milestones, completionMap])

  // Memoised derivations
  const { totalReward, completedMilestones, isComplete, earnedReward } = useMemo(() => {
    const total = milestones.reduce((sum, m) => sum + Number(m.rewardAmount), 0)
    const completedSet = new Set(completions.filter(c => c.completed).map(c => c.milestoneId))
    const completed = completedSet.size
    return {
      totalReward: total,
      completedMilestones: completed,
      isComplete: completed === milestones.length && milestones.length > 0,
      earnedReward: milestones
        .filter(m => completedSet.has(m.id))
        .reduce((sum, m) => sum + Number(m.rewardAmount), 0),
    }
  }, [milestones, completions])

  const handleAddEnrollee = useCallback(() => {
    if (address) {
      recordReferralEnrollment(questId, address)
    }
    addToast("Add enrollee clicked", "info")
  }, [addToast, address, questId])

  const handleAddMilestone = useCallback(() => {
    addToast("Add milestone clicked", "info")
  }, [addToast])

  const handleVerifyCompletion = useCallback(
    (milestoneId: number) => {
      addToast(`Verified milestone ${milestoneId}`, "success")
    },
    [addToast]
  )

  const handleClaimRewards = useCallback(
    async (
      enrollee: { id: number; address: string },
      claimableMilestones: { id: number; title: string; rewardAmount: number }[]
    ) => {
      setIsClaiming(true)
      setClaimSummary(null)

      try {
        const inputs = claimableMilestones.map(m => ({
          milestoneId: m.id,
          title: m.title,
          rewardAmount: BigInt(m.rewardAmount),
        }))

        const summary = await batchClaimRewards(
          enrollee.address,
          questId,
          enrollee.address,
          inputs,
          {
            onProgress: (result, index, total) => {
              if (result.status === "success") {
                addToast(
                  `Claimed "${result.milestoneTitle}" (${index + 1}/${total})`,
                  "success",
                  2000
                )
              } else {
                addToast(
                  `Failed to claim "${result.milestoneTitle}": ${result.error || "Unknown error"}`,
                  "error",
                  4000
                )
              }
            },
          }
        )

        setClaimSummary(summary)
        setIsClaimDialogOpen(true)

        if (summary.failureCount === 0) {
          addToast(`Successfully claimed all ${summary.successCount} milestones!`, "success", 5000)
        } else if (summary.successCount > 0) {
          addToast(
            `${summary.successCount} claimed, ${summary.failureCount} failed. Review details.`,
            "warning",
            6000
          )
        } else {
          addToast(`All ${summary.failureCount} claims failed. Check details.`, "error", 6000)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Batch claim failed"
        addToast(`Claim process error: ${message}`, "error", 6000)
      } finally {
        setIsClaiming(false)
      }
    },
    [questId, addToast]
  )

  const handleRetryFailed = useCallback(
    async (failedResults: MilestoneClaimResult[]) => {
      setIsRetrying(true)

      try {
        const retryInputs = failedResults.map(r => ({
          milestoneId: r.milestoneId,
          title: r.milestoneTitle,
          rewardAmount: r.rewardAmount ?? 0n,
        }))

        const enrollee = claimSummary?.enrollee || ""
        const retrySummary = await batchClaimRewards(enrollee, questId, enrollee, retryInputs, {
          onProgress: (result, index, total) => {
            if (result.status === "success") {
              addToast(
                `Retry: Claimed "${result.milestoneTitle}" (${index + 1}/${total})`,
                "success",
                2000
              )
            } else {
              addToast(
                `Retry: Failed "${result.milestoneTitle}": ${result.error || "Unknown error"}`,
                "error",
                4000
              )
            }
          },
        })

        const previousSuccesses = claimSummary?.results.filter(r => r.status === "success") || []
        const mergedResults = [...previousSuccesses, ...retrySummary.results]

        const mergedSummary: BatchClaimSummary = {
          results: mergedResults,
          successCount: mergedResults.filter(r => r.status === "success").length,
          failureCount: mergedResults.filter(r => r.status === "failed").length,
          totalAmount: (claimSummary?.totalAmount ?? 0n) + retrySummary.totalAmount,
          questId,
          enrollee,
        }

        setClaimSummary(mergedSummary)

        if (retrySummary.failureCount === 0) {
          addToast("All retried claims succeeded!", "success", 5000)
        } else {
          addToast(
            `${retrySummary.successCount} retried claims succeeded, ${retrySummary.failureCount} still failed.`,
            "warning",
            6000
          )
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Retry failed"
        addToast(`Retry error: ${message}`, "error", 6000)
      } finally {
        setIsRetrying(false)
      }
    },
    [questId, claimSummary, addToast]
  )

  const handleCloseClaimDialog = () => setIsClaimDialogOpen(false)

  const isLoading = questLoading || milestonesLoading || enrolleesLoading
  const error = questError || milestonesError || enrolleesError

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
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
  }))

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      <SectionErrorBoundary label="Quest header">
        <QuestHeaderPanel
          questId={questId}
          questName={quest.name}
          questDescription={quest.description}
          isComplete={isComplete}
          isArchived={quest.status === 1 || String(quest.status) === "Archived"}
          onBack={onBack}
          onAddEnrollee={handleAddEnrollee}
          onAddMilestone={handleAddMilestone}
          onToast={addToast}
        />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="Quest stats">
        <StatsPanel
          enrolleesCount={enrollees.length}
          milestonesCount={milestones.length}
          poolBalance={Number(poolBalance)}
          reservedReward={Number(reservedReward)}
          totalReward={totalReward}
        />

        <ProgressPanel
          completedMilestones={completedMilestones}
          totalMilestones={milestones.length}
          earnedReward={earnedReward}
        />
      </SectionErrorBoundary>

      <TabsNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        milestonesCount={milestones.length}
        enrolleesCount={enrollees.length}
        showAnalytics={true}
        showReferrals={true}
      />

      {activeTab === "milestones" && (
        <SectionErrorBoundary label="Milestones">
          <MilestonesSection
            milestones={mappedMilestones}
            completions={completions}
            enrollees={enrollees}
            questId={questId}
            onAddMilestone={handleAddMilestone}
            onVerifyCompletion={handleVerifyCompletion}
          />
        </SectionErrorBoundary>
      )}

      {activeTab === "enrollees" && (
        <SectionErrorBoundary label="Enrollees">
          <EnrolleesSection
            enrollees={enrollees}
            milestones={mappedMilestones}
            completions={completions}
            onAddEnrollee={handleAddEnrollee}
            onClaimRewards={handleClaimRewards}
            isClaiming={isClaiming}
          />
        </SectionErrorBoundary>
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
        <SectionErrorBoundary label="Quest Analytics">
          <QuestAnalyticsDashboard
            questId={questId}
            questTitle={quest.name}
            createdAt={quest.createdAt}
            totalEnrollees={enrollees.length}
            completedLearners={
              enrollees.filter(e => {
                const userCompletions = completions.filter(
                  c => c.enrollee === e.address && c.completed
                )
                return userCompletions.length === milestones.length && milestones.length > 0
              }).length
            }
            inProgressLearners={
              enrollees.filter(e => {
                const userCompletions = completions.filter(
                  c => c.enrollee === e.address && c.completed
                )
                return userCompletions.length > 0 && userCompletions.length < milestones.length
              }).length
            }
            stalledLearners={
              enrollees.filter(e => {
                const userCompletions = completions.filter(
                  c => c.enrollee === e.address && c.completed
                )
                return userCompletions.length === 0
              }).length
            }
            totalDistributedTokens={Number(reservedReward)}
            poolRemaining={Number(poolBalance)}
          />
        </SectionErrorBoundary>
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <BatchClaimResultDialog
        isOpen={isClaimDialogOpen}
        summary={claimSummary}
        onClose={handleCloseClaimDialog}
        onRetryFailed={handleRetryFailed}
        isRetrying={isRetrying}
      />

      <ReportQuestDialog
        isOpen={isReportOpen}
        questId={questId}
        questName={quest.name}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  )
}
