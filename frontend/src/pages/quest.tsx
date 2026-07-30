// frontend/src/pages/quest.tsx (refactored)
import { useState, useMemo, useCallback } from "react"
import { ToastContainer } from "@/components/toast"
import { useToast } from "@/hooks/use-toast"
import { MOCK_QUESTS, MOCK_MILESTONES, MOCK_ENROLLEES, MOCK_COMPLETIONS } from "@/lib/mock-data"
import { QuestHeaderPanel } from "@/components/quest/QuestHeaderPanel"
import { StatsPanel } from "@/components/quest/StatsPanel"
import { ProgressPanel } from "@/components/quest/ProgressPanel"
import { TabsNavigation } from "@/components/quest/TabsNavigation"
import { MilestonesSection } from "@/components/quest/MilestonesSection"
import { EnrolleesSection } from "@/components/quest/EnrolleesSection"
import { BatchClaimResultDialog } from "@/components/quest/BatchClaimResultDialog"
import { batchClaimRewards } from "@/lib/contracts/batch-claims"
import { Button } from "@/components/ui/button"
import { SectionErrorBoundary } from "@/components/error-boundary"
import type { BatchClaimSummary, MilestoneClaimResult } from "@/lib/contract-types"

interface QuestViewProps {
  questId: number
  onBack: () => void
}

type Tab = "milestones" | "enrollees"

export function QuestView({ questId, onBack }: QuestViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("milestones")
  const { toasts, addToast, removeToast } = useToast()

  // Batch claim state
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSummary, setClaimSummary] = useState<BatchClaimSummary | null>(null)
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const quest = useMemo(() => MOCK_QUESTS.find(q => q.id === questId), [questId])
  const milestones = useMemo(() => MOCK_MILESTONES[questId] || [], [questId])
  const enrolleeAddresses = useMemo(() => MOCK_ENROLLEES[questId] || [], [questId])
  const completions = useMemo(() => MOCK_COMPLETIONS[questId] || [], [questId])

  // MOCK_ENROLLEES (like the real get_enrollees contract call) is a plain list
  // of addresses; the section components render a richer enrollee shape, so
  // adapt each address into one here.
  const enrollees = useMemo(
    () => enrolleeAddresses.map((address, index) => ({ id: index, address })),
    [enrolleeAddresses]
  )

  // Memoised derivations — avoids re-running array traversals on every render (#921)
  const { totalReward, completedMilestones, isComplete, earnedReward } = useMemo(() => {
    const total = milestones.reduce((sum, m) => sum + m.rewardAmount, 0)
    const completedSet = new Set(completions.filter(c => c.completed).map(c => c.milestoneId))
    const completed = completedSet.size
    return {
      totalReward: total,
      completedMilestones: completed,
      isComplete: completed === milestones.length && milestones.length > 0,
      earnedReward: milestones
        .filter(m => completedSet.has(m.id))
        .reduce((sum, m) => sum + m.rewardAmount, 0),
    }
  }, [milestones, completions])

  const handleAddEnrollee = () => {
    // TODO: Implement add enrollee logic
    addToast("Add enrollee clicked", "info")
  }

  const handleAddMilestone = () => {
    // TODO: Implement add milestone logic
    addToast("Add milestone clicked", "info")
  }

  const handleVerifyCompletion = (milestoneId: number) => {
    // TODO: Implement verify completion logic
    addToast(`Verified milestone ${milestoneId}`, "success")
  }

  /**
   * Initiates batch claiming of rewards for a specific enrollee's completed milestones.
   *
   * Each milestone is claimed independently — if some fail the dialog shows per-item
   * status so the user can retry only the failed claims.
   */
  const handleClaimRewards = useCallback(
    async (
      enrollee: { id: number; address: string },
      claimableMilestones: { id: number; title: string; rewardAmount: number }[]
    ) => {
      setIsClaiming(true)
      setClaimSummary(null)

      try {
        // Build batch inputs from claimable milestones
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
              // Show live progress toasts during batch processing
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

        // Show summary toast
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

  /**
   * Retries only the failed milestone claims from a previous batch operation.
   */
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

        // Merge retry results with the original successful ones
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

  if (!quest) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="mb-4 text-2xl font-semibold">Quest not found</h2>
        <Button variant="outline" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Background */}
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      <SectionErrorBoundary label="Quest header">
        <QuestHeaderPanel
          questId={questId}
          questName={quest.name}
          questDescription={quest.description}
          isComplete={isComplete}
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
          poolBalance={quest.poolBalance ?? 0}
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
      />

      {activeTab === "milestones" && (
        <SectionErrorBoundary label="Milestones">
          <MilestonesSection
            milestones={milestones}
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
            milestones={milestones}
            completions={completions}
            onAddEnrollee={handleAddEnrollee}
            onClaimRewards={handleClaimRewards}
            isClaiming={isClaiming}
          />
        </SectionErrorBoundary>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Batch claim result dialog */}
      <BatchClaimResultDialog
        isOpen={isClaimDialogOpen}
        summary={claimSummary}
        onClose={handleCloseClaimDialog}
        onRetryFailed={handleRetryFailed}
        isRetrying={isRetrying}
      />
    </div>
  )
}
