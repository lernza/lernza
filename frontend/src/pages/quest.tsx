import { useMemo, useState } from "react"
// In-memory cache for completion status: key -> { completed: boolean, timestamp: number }
const completionCache = new Map<string, { completed: boolean; timestamp: number }>()
const CACHE_TTL_MS = 60_000 // 60 seconds TTL

async function fetchWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let currentIndex = 0

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++
      results[idx] = await fn(items[idx])
    }
  })

  await Promise.all(workers)
  return results
}

// frontend/src/pages/quest.tsx (wired to on-chain data)
import { useState, useMemo, useCallback, useEffect } from "react"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"
import {
  useQuest,
  useMilestones,
  useEnrollees,
  useRewardPool,
  useTotalReservedReward,
} from "@/hooks/use-quest-data"
import { queryKeys } from "@/lib/query-keys"
import { milestoneClient } from "@/lib/contracts/milestone"
import type { DisputeOutcome } from "@/lib/contracts/milestone-client"
import { questClient } from "@/lib/contracts/quest"
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
  const queryClient = useQueryClient()

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

  const handleRemoveEnrollee = useCallback(
    (enrollee: { address: string }) => setEnrolleeToRemove(enrollee),
    []
  )

  const confirmRemoveEnrollee = useCallback(
    async (enrollee: { address: string }) => {
      if (!address || !quest || quest.owner !== address) {
        addToast("Only the quest owner can remove a learner.", "error")
        return
      }
      try {
        await questClient.removeEnrollee(address, questId, enrollee.address)
        setEnrolleeToRemove(null)
        addToast("Learner removed. Verified work and earned rewards remain protected.", "success")
        await queryClient.invalidateQueries({ queryKey: queryKeys.enrollees(questId) })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Removal failed."
        addToast(
          message.includes("RemovalBlockedByPendingApproval") ||
            message.includes("LeaveBlockedByPendingApproval")
            ? "Removal is blocked while a submission is awaiting review or reward settlement."
            : message,
          "error"
        )
      }
    },
    [addToast, address, quest, questId, queryClient]
  )

  const handleAddMilestone = useCallback(() => {
    addToast("Add milestone clicked", "info")
  }, [addToast])

  const handleVerifyCompletion = useCallback(
    (milestoneId: number) => {
      addToast(`Verified milestone ${milestoneId}`, "success")
    },
    [addToast]
  )

  // Dispute state for the connected learner, so an appealable submission shows
  // the right affordance and status. See issue #1614.
  const [disputeStates, setDisputeStates] = useState<
    Map<number, MilestoneDisputeState>
  >(new Map())
  const [isDisputePending, setIsDisputePending] = useState(false)
  const [ownerDisputes, setOwnerDisputes] = useState<OwnerDispute[]>([])
  const isQuestOwner = !!address && !!quest?.owner && quest.owner === address

  // Owners additionally see every open dispute awaiting their ruling.
  useEffect(() => {
    if (!isQuestOwner) {
      setOwnerDisputes([])
      return
    }

    let cancelled = false

    const loadOwnerDisputes = async () => {
      try {
        const entries = await milestoneClient.getOpenDisputes(questId, 0, 100)
        if (cancelled) return
        setOwnerDisputes(
          entries.map(entry => ({
            milestoneId: entry.milestoneId,
            enrollee: entry.enrollee,
            reason: entry.record.reason
          }))
        )
      } catch {
        // Non-fatal: the resolve affordance simply stays hidden.
      }
    }

    void loadOwnerDisputes()
    return () => {
      cancelled = true
    }
  }, [isQuestOwner, questId])

  useEffect(() => {
    if (!address || milestones.length === 0) {
      setDisputeStates(new Map())
      return
    }

    let cancelled = false

    const loadDisputes = async () => {
      try {
        const entries: [number, MilestoneDisputeState][] = []
        for (const milestone of milestones) {
          const [status, open, cooldown] = await Promise.all([
            milestoneClient.getDisputeStatus(questId, milestone.id, address),
            milestoneClient.hasOpenDispute(questId, milestone.id, address),
            milestoneClient.getDisputeCooldownRemaining(questId, milestone.id, address)
          ])
          if (status === null) continue
          entries.push([
            milestone.id,
            {
              status,
              reason: "",
              // A closed dispute with a live cooldown means "recently ruled".
              cooldownSeconds: open ? 0 : cooldown
            }
          ])
        }
        if (!cancelled) setDisputeStates(new Map(entries))
      } catch {
        // Non-fatal: the dispute affordance simply stays hidden.
      }
    }

    void loadDisputes()
    return () => {
      cancelled = true
    }
  }, [address, questId, milestones])

  const handleOpenDispute = useCallback(
    async (milestoneId: number, reason: string) => {
      if (!address) return
      setIsDisputePending(true)
      try {
        await milestoneClient.openDispute(address, questId, milestoneId, reason, {
          onSigning: () => addToast("Opening dispute…", "info"),
          onSuccess: () => {
            addToast("Dispute opened. The quest owner will review it.", "success")
            setDisputeStates(
              prev =>
                new Map(prev).set(milestoneId, { status: 0, reason, cooldownSeconds: 0 })
            )
          },
          onError: err => addToast(String(err), "error", 5000)
        })
      } catch (err) {
        addToast(err instanceof Error ? err.message : String(err), "error", 5000)
      } finally {
        setIsDisputePending(false)
      }
    },
    [address, questId, addToast]
  )

  const handleResolveDispute = useCallback(
    async (
      milestoneId: number,
      enrollee: string,
      outcome: DisputeOutcome,
      note?: string
    ) => {
      if (!address) return
      setIsDisputePending(true)
      try {
        await milestoneClient.resolveDispute(
          address,
          questId,
          milestoneId,
          enrollee,
          outcome,
          note,
          {
            onSuccess: () => addToast("Dispute resolved.", "success"),
            onError: err => addToast(String(err), "error", 5000)
          }
        )
        setOwnerDisputes(prev => prev.filter(d => d.milestoneId !== milestoneId))
        setDisputeStates(prev => {
          const next = new Map(prev)
          next.delete(milestoneId)
          return next
        })
      } catch (err) {
        addToast(err instanceof Error ? err.message : String(err), "error", 5000)
      } finally {
        setIsDisputePending(false)
      }
    },
    [address, questId, addToast]
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

  const isLoading = questLoading || milestonesLoading || enrolleesLoading || prerequisitesLoading
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
