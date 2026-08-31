/** Soroban contract client for quest milestones (create, verify completion, claim rewards). */
import { isDev } from "@/lib/env"
import { Address, Contract, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk"
import type { TransactionLifecycleHandlers, TransactionResult } from "./client"
import {
  signAndSubmitTracked,
  signAndSubmit,
  simulateContractRead,
  prepareContractTransaction,
} from "./client"
import { withContractLogging } from "./logger"
import { contractAddresses } from "./config"

const CONTRACT_ID = contractAddresses.milestone

const MILESTONE_ERROR_MESSAGES: Record<number, string> = {
  1: "Milestone not found.",
  2: "You are not authorized to manage milestones for this quest.",
  7: "Only the quest owner can manage milestones for this quest.",
  8: "Milestone contract is not configured.",
  12: "This learner is not enrolled in the quest.",
  14: "Complete the previous milestone first.",
}

export interface MilestoneInfo {
  id: number
  questId: number
  title: string
  description: string
  rewardAmount: bigint
  requiresPrevious: boolean
  prerequisiteIds: number[]
  difficulty?: string
  estimatedDuration?: number
  prerequisitesKnowledge?: string
}

export type FeedbackAction = "Approve" | "Reject" | "RequestChanges"

export interface MilestoneFeedback {
  reviewer: string
  action: FeedbackAction
  comment: string
  createdAt: number
}

export interface VerifyCompletionResult extends TransactionResult {
  rewardAmount?: bigint
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return BigInt(value)
  if (typeof value === "string" && value.length > 0) return BigInt(value)
  return 0n
}

function parseContractErrorCode(message?: string): number | null {
  if (!message) return null
  const match = message.match(/Error\(Contract, #(\d+)\)/)
  return match ? Number(match[1]) : null
}

function normalizeMilestoneError(message?: string): string | undefined {
  if (!message) return message
  const code = parseContractErrorCode(message)
  return code && MILESTONE_ERROR_MESSAGES[code] ? MILESTONE_ERROR_MESSAGES[code] : message
}

export class MilestoneClient {
  private contract: Contract | null

  constructor() {
    if (CONTRACT_ID) {
      try {
        this.contract = new Contract(CONTRACT_ID)
      } catch {
        this.contract = null
        if (isDev) {
          console.error(`[MilestoneClient] Invalid VITE_MILESTONE_CONTRACT_ID: "${CONTRACT_ID}"`)
        }
      }
    } else {
      this.contract = null
    }
  }

  private getContract(): Contract {
    if (!this.contract)
      throw new Error("Milestone contract not configured. Set VITE_MILESTONE_CONTRACT_ID.")
    return this.contract
  }

  async getMilestone(questId: number, milestoneId: number): Promise<MilestoneInfo | null> {
    const result = await this.invokeRead("get_milestone", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
    ])
    return result ? this.withPrerequisites(this.parseMilestoneInfo(result), questId) : null
  }

  async listMilestones(questId: number): Promise<MilestoneInfo[]> {
    const result = await this.invokeRead("get_milestones", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    if (!Array.isArray(result)) return []
    return Promise.all(result.map(async raw => this.withPrerequisites(this.parseMilestoneInfo(raw), questId)))
  }

  async getMilestones(questId: number): Promise<MilestoneInfo[]> {
    const result = await this.invokeRead("get_milestones", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    if (!Array.isArray(result)) return []
    return Promise.all(result.map(async raw => this.withPrerequisites(this.parseMilestoneInfo(raw), questId)))
  }

  async getMilestoneCount(questId: number): Promise<number> {
    const result = await this.invokeRead("get_milestone_count", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    return result ? Number(result) : 0
  }

  async getTotalReservedReward(questId: number): Promise<bigint> {
    const result = await this.invokeRead("get_total_reserved_reward", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    return result ? toBigInt(result) : 0n
  }

  async getMilestonePrerequisites(questId: number, milestoneId: number): Promise<number[]> {
    const result = await this.invokeRead("get_milestone_prerequisites", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
    ])
    return Array.isArray(result) ? result.map(Number) : []
  }

  async isCompleted(questId: number, milestoneId: number, user: string): Promise<boolean> {
    const result = await this.invokeRead("is_completed", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(user).toScVal(),
    ])
    return !!result
  }

  async getEnrolleeCompletions(questId: number, enrollee: string): Promise<number> {
    const result = await this.invokeRead("get_enrollee_completions", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    return result ? Number(result) : 0
  }

  async createMilestone(
    owner: string,
    questId: number,
    title: string,
    description: string,
    rewardAmount: bigint,
    requiresPrevious = false,
    difficulty?: string,
    estimatedDuration?: number,
    prerequisitesKnowledge?: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    const tx = await this.buildTx(owner, "create_milestone", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(title, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(rewardAmount, { type: "i128" }),
      nativeToScVal(requiresPrevious),
      nativeToScVal(difficulty || null),
      nativeToScVal(estimatedDuration || null, { type: "u32" }),
      nativeToScVal(prerequisitesKnowledge || null),
    ])
    return this.normalizeTransactionResult(
      await signAndSubmitTracked(tx, "Create Milestone", handlers)
    )
  }

  async createMilestoneWithPrerequisites(
    owner: string,
    questId: number,
    title: string,
    description: string,
    rewardAmount: bigint,
    prerequisiteIds: number[],
    difficulty?: string,
    estimatedDuration?: number,
    prerequisitesKnowledge?: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    const tx = await this.buildTx(owner, "create_milestone_with_prerequisites", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(title, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(rewardAmount, { type: "i128" }),
      xdr.ScVal.scvVec(prerequisiteIds.map(id => nativeToScVal(id, { type: "u32" }))),
      nativeToScVal(difficulty || null),
      nativeToScVal(estimatedDuration || null, { type: "u32" }),
      nativeToScVal(prerequisitesKnowledge || null),
    ])
    return this.normalizeTransactionResult(await signAndSubmitTracked(tx, "Create Milestone", handlers))
  }

  async verifyCompletion(
    owner: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<VerifyCompletionResult> {
    const tx = await this.buildTx(owner, "verify_completion", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    const result = this.normalizeTransactionResult(
      await signAndSubmitTracked(tx, "Verify Milestone Completion", handlers)
    )
    return {
      ...result,
      rewardAmount: this.parseNumericResult(result.resultXdr),
    }
  }

  async verifyCompletionWithFeedback(
    owner: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    feedback: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<VerifyCompletionResult> {
    const tx = await this.buildTx(owner, "verify_completion_with_feedback", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(feedback, { type: "string" }),
    ])
    const result = this.normalizeTransactionResult(await signAndSubmit(tx, handlers))
    return {
      ...result,
      rewardAmount: this.parseNumericResult(result.resultXdr),
    }
  }

  async rejectCompletionWithFeedback(
    reviewer: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    feedback: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    const tx = await this.buildTx(reviewer, "reject_completion_with_feedback", [
      new Address(reviewer).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(feedback, { type: "string" }),
    ])
    return this.normalizeTransactionResult(await signAndSubmit(tx, handlers))
  }

  async requestChangesWithFeedback(
    reviewer: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    feedback: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    const tx = await this.buildTx(reviewer, "request_changes_with_feedback", [
      new Address(reviewer).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(feedback, { type: "string" }),
    ])
    return this.normalizeTransactionResult(await signAndSubmit(tx, handlers))
  }

  async approveCompletionWithFeedback(
    peer: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    feedback: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<VerifyCompletionResult> {
    const tx = await this.buildTx(peer, "approve_completion_with_feedback", [
      new Address(peer).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(feedback, { type: "string" }),
    ])
    const result = this.normalizeTransactionResult(await signAndSubmit(tx, handlers))
    return {
      ...result,
      rewardAmount: this.parseNumericResult(result.resultXdr),
    }
  }

  async getMilestoneFeedbackHistory(
    questId: number,
    milestoneId: number,
    enrollee: string
  ): Promise<MilestoneFeedback[]> {
    const result = await this.invokeRead("get_milestone_feedback_history", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    if (!Array.isArray(result)) return []
    return result.map(raw => {
      const rec = raw as Record<string, unknown>
      const actionRaw = rec.action as Record<string, unknown> | string | number
      let action: FeedbackAction = "Approve"
      if (typeof actionRaw === "string") {
        action = actionRaw as FeedbackAction
      } else if (typeof actionRaw === "number") {
        action = actionRaw === 1 ? "Reject" : actionRaw === 2 ? "RequestChanges" : "Approve"
      } else if (actionRaw && typeof actionRaw === "object") {
        action = Object.keys(actionRaw)[0] as FeedbackAction
      }
      return {
        reviewer: String(rec.reviewer),
        action,
        comment: String(rec.comment),
        createdAt: Number(rec.created_at || 0),
      }
    })
  }

  private normalizeTransactionResult(result: TransactionResult): TransactionResult {
    if (result.status !== "FAILED") {
      return result
    }

    return {
      ...result,
      error: normalizeMilestoneError(result.error),
    }
  }

  private parseMilestoneInfo(raw: unknown): MilestoneInfo {
    const record = raw as Record<string, unknown>
    return {
      id: Number(record.id),
      questId: Number(record.quest_id),
      title: String(record.title),
      description: String(record.description),
      rewardAmount: toBigInt(record.reward_amount),
      requiresPrevious: Boolean(record.requires_previous),
      difficulty: record.difficulty ? String(record.difficulty) : undefined,
      estimatedDuration: record.estimated_duration ? Number(record.estimated_duration) : undefined,
      prerequisitesKnowledge: record.prerequisites_knowledge ? String(record.prerequisites_knowledge) : undefined,
      prerequisiteIds: Array.isArray(record.prerequisite_ids)
        ? record.prerequisite_ids.map(Number)
        : [],
    }
  }

  private async withPrerequisites(milestone: MilestoneInfo, questId: number): Promise<MilestoneInfo> {
    const prerequisiteIds = await this.getMilestonePrerequisites(questId, milestone.id)
    return { ...milestone, prerequisiteIds }
  }

  private parseNumericResult(resultXdr?: string): bigint | undefined {
    if (!resultXdr) return undefined

    try {
      const value = scValToNative(xdr.ScVal.fromXDR(resultXdr, "base64"))
      return toBigInt(value)
    } catch {
      return undefined
    }
  }

  private async invokeRead(method: string, args: xdr.ScVal[]) {
    return withContractLogging("milestone", method, {}, async () => {
      return simulateContractRead(this.getContract(), { method, args })
    }).catch((e: unknown) => {
      if (isDev) {
        console.error(`Read error ${method}:`, e)
      }
      return null
    })
  }

  private async buildTx(source: string, method: string, args: xdr.ScVal[]) {
    return prepareContractTransaction(this.getContract(), source, { method, args })
  }
}

export const milestoneClient = new MilestoneClient()
export { normalizeMilestoneError, parseContractErrorCode }
