import { useCallback, useState } from "react"
import { batchClaimRewards } from "@/lib/contracts/batch-claims"
import type { useToast } from "@/hooks/use-toast"
import type {
  BatchClaimSummary,
  MilestoneClaimResult,
} from "@/lib/contract-types"

export interface UseQuestClaimsParams {
  questId: number
  addToast: ReturnType<typeof useToast>["addToast"]
}

/**
 * Batch reward-claim flow: runs the claims, tracks the in-flight summary shown
 * in the result dialog, and supports retrying only the failed milestones.
 */
export function useQuestClaims({ questId, addToast }: UseQuestClaimsParams) {
  // Batch claim state
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSummary, setClaimSummary] = useState<BatchClaimSummary | null>(null)
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

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

  return {
    isClaiming,
    claimSummary,
    isClaimDialogOpen,
    isRetrying,
    handleClaimRewards,
    handleRetryFailed,
    handleCloseClaimDialog,
  }
}
