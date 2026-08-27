/**
 * Batch milestone reward claiming utility.
 *
 * Processes multiple reward distributions sequentially and captures per-milestone
 * success/failure status with detailed error reasons for the UI to display.
 * Failed items do not abort the batch — they are tracked individually so users
 * can retry only the failed claims.
 */

import { rewardsClient } from "./rewards"
import type { TransactionLifecycleHandlers } from "./client"
import type { MilestoneClaimResult, BatchClaimSummary } from "../contract-types"
import { parseContractErrorCode } from "../contract-errors"
import { REWARDS_CONTRACT_ERRORS } from "../contract-errors"

export interface BatchClaimInput {
  milestoneId: number
  title: string
  rewardAmount: bigint
}

export interface BatchClaimOptions {
  /** Called after each item completes so the UI can show live progress. */
  onProgress?: (result: MilestoneClaimResult, index: number, total: number) => void
  /** Passed through to each transaction for Freighter lifecycle events. */
  txHandlers?: TransactionLifecycleHandlers
}

/**
 * Claims rewards for multiple milestones in sequence.
 *
 * Each milestone is processed independently — a failure on one does not prevent
 * the remaining items from being attempted. Results are collected into a summary
 * with per-item status, error reasons, and aggregate counts.
 */
export async function batchClaimRewards(
  authority: string,
  questId: number,
  enrollee: string,
  milestones: BatchClaimInput[],
  options: BatchClaimOptions = {}
): Promise<BatchClaimSummary> {
  const results: MilestoneClaimResult[] = []
  let totalAmount = 0n

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i]
    let result: MilestoneClaimResult

    try {
      const txResult = await rewardsClient.distributeReward(
        authority,
        questId,
        m.milestoneId,
        enrollee,
        m.rewardAmount,
        options.txHandlers
      )

      if (txResult.status === "SUCCESS") {
        result = {
          milestoneId: m.milestoneId,
          milestoneTitle: m.title,
          status: "success",
          rewardAmount: m.rewardAmount,
          txHash: txResult.txHash,
        }
        totalAmount += m.rewardAmount
      } else {
        result = {
          milestoneId: m.milestoneId,
          milestoneTitle: m.title,
          status: "failed",
          rewardAmount: m.rewardAmount,
          error: normalizeBatchError(txResult.error),
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error during claim"
      result = {
        milestoneId: m.milestoneId,
        milestoneTitle: m.title,
        status: "failed",
        rewardAmount: m.rewardAmount,
        error: normalizeBatchError(message),
      }
    }

    results.push(result)
    options.onProgress?.(result, i, milestones.length)
  }

  const successCount = results.filter(r => r.status === "success").length
  const failureCount = results.filter(r => r.status === "failed").length

  return {
    results,
    successCount,
    failureCount,
    totalAmount,
    questId,
    enrollee,
  }
}

/**
 * Map raw contract error messages to user-friendly strings,
 * falling back to the original message if no mapping exists.
 */
function normalizeBatchError(message?: string): string | undefined {
  if (!message) return message
  const code = parseContractErrorCode(message)
  if (code !== null && REWARDS_CONTRACT_ERRORS[code]) {
    return REWARDS_CONTRACT_ERRORS[code]
  }
  return message
}
