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
import { mapContractError } from "../contract-errors"

const CONTRACT_ID = contractAddresses.milestone

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
  /** Optional per-milestone submission deadline (unix seconds) — see #1652. */
  deadline?: number
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

/**
 * Lifecycle of a milestone dispute, mirroring the contract's `DisputeStatus`
 * enum. `Escalated` means the quest owner handed the dispute to the contract
 * administrator for arbitration. See issue #1614.
 */
export const DisputeStatus = {
  Pending: 0,
  Upheld: 1,
  Overturned: 2,
  Escalated: 3,
} as const
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus]

/** Ruling a resolver can issue on a dispute. See issue #1614. */
export type DisputeOutcome = "upheld" | "overturned" | "escalated"

export interface DisputeRecord {
  status: DisputeStatus
  reason: string
  openedAt: number
  rewardAmount: bigint
  resolver?: string
  resolvedAt?: number
  resolutionNote?: string
}

export interface DisputeEntry {
  questId: number
  milestoneId: number
  enrollee: string
  record: DisputeRecord
}

/** Maximum reason length accepted by `open_dispute` (mirrors the contract). */
export const MAX_DISPUTE_REASON_LEN = 500
/** Upper bound on the page size accepted by the dispute queries. */
export const MAX_DISPUTE_PAGE = 100

function parseDisputeStatus(raw: unknown): DisputeStatus {
  if (typeof raw === "number") {
    if (raw === 1) return DisputeStatus.Upheld
    if (raw === 2) return DisputeStatus.Overturned
    if (raw === 3) return DisputeStatus.Escalated
    return DisputeStatus.Pending
  }
  if (raw && typeof raw === "object") {
    const name = Object.keys(raw as Record<string, unknown>)[0]
    if (name === "Upheld") return DisputeStatus.Upheld
    if (name === "Overturned") return DisputeStatus.Overturned
    if (name === "Escalated") return DisputeStatus.Escalated
  }
  return DisputeStatus.Pending
}

const OUTCOME_TO_SCV: Record<DisputeOutcome, number> = {
  upheld: 0,
  overturned: 1,
  escalated: 2,
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return BigInt(value)
  if (typeof value === "string" && value.length > 0) return BigInt(value)
  return 0n
}

/**
 * Normalizes a failed transaction into plain language.
 *
 * Delegates to `mapContractError` with the `"milestone"` scope so this path and
 * every other consumer of `MILESTONE_ERRORS` render identical wording for the
 * same code. The client previously kept a private, partial copy of the table
 * (codes 1, 2, 7, 8, 12, 14, 23-31) that had to be updated by hand and
 * disagreed with `contract-errors.ts` on 3, 4 and 5.
 */
function normalizeMilestoneError(message?: string): string | undefined {
  if (!message) return message
  return mapContractError(message, "milestone")
}

export class MilestoneClient {
  private contract: Contract | null
  /**
   * Prerequisite ids by `${questId}:${milestoneId}` (issue #1731).
   *
   * A milestone list cost one `get_milestone_prerequisites` RPC call per
   * milestone, every render pass, even though prerequisites are written once at
   * milestone-creation time and never change afterwards. A 20-milestone quest
   * paid 20 extra round-trips to re-read data that cannot have moved.
   */
  private prereqCache = new Map<string, number[]>()
  /** In-flight prerequisite reads, so concurrent callers share one request. */
  private prereqInFlight = new Map<string, Promise<number[]>>()

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

  async getMilestones(questId: number): Promise<MilestoneInfo[]> {
    const result = await this.invokeRead("get_milestones", [
      nativeToScVal(questId, { type: "u32" }),
    ])
    if (!Array.isArray(result)) return []
    return Promise.all(
      result.map(async raw => this.withPrerequisites(this.parseMilestoneInfo(raw), questId))
    )
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
    const key = `${questId}:${milestoneId}`

    const cached = this.prereqCache.get(key)
    if (cached) return cached

    // Single-flight: `getMilestone` and `getMilestones` can
    // all reach the same milestone in the same tick, and a page can mount more
    // than one consumer. Without this, N callers meant N identical RPC calls.
    const inFlight = this.prereqInFlight.get(key)
    if (inFlight) return inFlight

    const request = (async () => {
      const result = await this.invokeRead("get_milestone_prerequisites", [
        nativeToScVal(questId, { type: "u32" }),
        nativeToScVal(milestoneId, { type: "u32" }),
      ])
      const prerequisiteIds = Array.isArray(result) ? result.map(Number) : []
      this.prereqCache.set(key, prerequisiteIds)
      return prerequisiteIds
    })()

    this.prereqInFlight.set(key, request)

    try {
      return await request
    } finally {
      this.prereqInFlight.delete(key)
    }
  }

  /**
   * Drop cached prerequisite data so the next read refetches.
   *
   * Prerequisites are immutable once a milestone exists — they are only written
   * by `create_milestone_with_prerequisites` — so a cache miss is rare. But a
   * newly created milestone has no cached entry to begin with, and a
   * caller-supplied `milestoneId` is not enough to reason about, so this is
   * exposed for the rare caller that has just changed or replaced milestones
   * behind the client's back (e.g. a different tab, or a direct contract call).
   *
   * With no `milestoneId`, every milestone in the quest is invalidated.
   */
  invalidatePrerequisites(questId: number, milestoneId?: number): void {
    if (milestoneId === undefined) {
      const prefix = `${questId}:`
      for (const key of this.prereqCache.keys()) {
        if (key.startsWith(prefix)) this.prereqCache.delete(key)
      }
      return
    }
    this.prereqCache.delete(`${questId}:${milestoneId}`)
  }

  /** Drop all cached prerequisite data. */
  clearPrerequisiteCache(): void {
    this.prereqCache.clear()
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

  async getCompletionBatch(
    questId: number,
    enrollee: string,
    milestoneIds: number[]
  ): Promise<boolean[]> {
    const result = await this.invokeRead("get_completion_batch", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      xdr.ScVal.scvVec(milestoneIds.map(id => nativeToScVal(id, { type: "u32" }))),
    ])
    if (!Array.isArray(result)) return milestoneIds.map(() => false)
    return result.map(v => !!v)
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
    const result = await signAndSubmitTracked(tx, "Create Milestone", handlers)
    // A read for this id may have been cached as "no prerequisites" before the
    // milestone existed, so drop it rather than serve a stale empty answer.
    this.invalidatePrerequisites(questId)
    return this.normalizeTransactionResult(result)
  }

  /**
   * Sets (or clears, passing `undefined`) a milestone's own submission
   * deadline. Owner only; rejected if it exceeds the quest's own deadline.
   */
  async setMilestoneDeadline(
    owner: string,
    questId: number,
    milestoneId: number,
    deadline: number | undefined,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    const tx = await this.buildTx(owner, "set_milestone_deadline", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      nativeToScVal(deadline ?? null, { type: "u64" }),
    ])
    return this.normalizeTransactionResult(
      await signAndSubmitTracked(tx, "Set Milestone Deadline", handlers)
    )
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

  async verifyPartialCompletion(
    owner: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    criteriaMet: number,
    handlers?: TransactionLifecycleHandlers
  ): Promise<VerifyCompletionResult> {
    const tx = await this.buildTx(owner, "verify_partial_completion", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(criteriaMet, { type: "u32" }),
    ])
    const result = this.normalizeTransactionResult(
      await signAndSubmitTracked(tx, "Verify Partial Completion", handlers)
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

  /**
   * Open a dispute against a rejected submission. The learner supplies a short
   * justification which the quest owner (or contract admin) sees when ruling.
   * See issue #1614.
   */
  async openDispute(
    enrollee: string,
    questId: number,
    milestoneId: number,
    reason: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    const tx = await this.buildTx(enrollee, "open_dispute", [
      new Address(enrollee).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      nativeToScVal(reason, { type: "string" }),
    ])
    return this.normalizeTransactionResult(await signAndSubmitTracked(tx, "Open Dispute", handlers))
  }

  /**
   * Rule on an open dispute. Only the quest owner or the contract admin may
   * call this, and never for a dispute they opened themselves.
   * See issue #1614.
   */
  async resolveDispute(
    resolver: string,
    questId: number,
    milestoneId: number,
    enrollee: string,
    outcome: DisputeOutcome,
    note?: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    const tx = await this.buildTx(resolver, "resolve_dispute", [
      new Address(resolver).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
      nativeToScVal(OUTCOME_TO_SCV[outcome], { type: "u32" }),
      nativeToScVal(note || null),
    ])
    return this.normalizeTransactionResult(
      await signAndSubmitTracked(tx, "Resolve Dispute", handlers)
    )
  }

  /** Current status of a single dispute, or `null` when none was opened. */
  async getDisputeStatus(
    questId: number,
    milestoneId: number,
    enrollee: string
  ): Promise<DisputeStatus | null> {
    const result = await this.invokeRead("get_dispute_status", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    if (result === null || result === undefined) return null
    return parseDisputeStatus(result)
  }

  /** True while a dispute is awaiting a ruling. */
  async hasOpenDispute(questId: number, milestoneId: number, enrollee: string): Promise<boolean> {
    return (
      (await this.invokeRead("has_open_dispute", [
        nativeToScVal(questId, { type: "u32" }),
        nativeToScVal(milestoneId, { type: "u32" }),
        new Address(enrollee).toScVal(),
      ])) === true
    )
  }

  /** Seconds remaining before another dispute can be opened, or 0. */
  async getDisputeCooldownRemaining(
    questId: number,
    milestoneId: number,
    enrollee: string
  ): Promise<number> {
    const result = await this.invokeRead("dispute_cooldown_remaining", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal(),
    ])
    return result ? Number(result) : 0
  }

  /** Page through every dispute opened on a quest, oldest first. */
  async getDisputes(
    questId: number,
    offset = 0,
    limit = MAX_DISPUTE_PAGE
  ): Promise<DisputeEntry[]> {
    return this.fetchDisputes("get_disputes", questId, offset, limit)
  }

  /** Page through the disputes on a quest still awaiting a ruling. */
  async getOpenDisputes(
    questId: number,
    offset = 0,
    limit = MAX_DISPUTE_PAGE
  ): Promise<DisputeEntry[]> {
    return this.fetchDisputes("get_open_disputes", questId, offset, limit)
  }

  private async fetchDisputes(
    method: string,
    questId: number,
    offset: number,
    limit: number
  ): Promise<DisputeEntry[]> {
    const result = await this.invokeRead(method, [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(offset, { type: "u32" }),
      nativeToScVal(Math.min(limit, MAX_DISPUTE_PAGE), { type: "u32" }),
    ])
    if (!Array.isArray(result)) return []
    return result.map(raw => this.parseDisputeEntry(raw))
  }

  private parseDisputeEntry(raw: unknown): DisputeEntry {
    const entry = raw as Record<string, unknown>
    const record = (entry.record ?? {}) as Record<string, unknown>
    return {
      questId: Number(entry.quest_id ?? 0),
      milestoneId: Number(entry.milestone_id ?? 0),
      enrollee: String(entry.enrollee ?? ""),
      record: {
        status: parseDisputeStatus(record.status),
        reason: String(record.reason ?? ""),
        openedAt: Number(record.opened_at ?? 0),
        rewardAmount: toBigInt(record.reward_amount),
        resolver: record.resolver ? String(record.resolver) : undefined,
        resolvedAt: record.resolved_at ? Number(record.resolved_at) : undefined,
        resolutionNote: record.resolution_note ? String(record.resolution_note) : undefined,
      },
    }
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
      prerequisitesKnowledge: record.prerequisites_knowledge
        ? String(record.prerequisites_knowledge)
        : undefined,
      deadline: record.deadline ? Number(record.deadline) : undefined,
    }
  }

  private async withPrerequisites(
    milestone: MilestoneInfo,
    questId: number
  ): Promise<MilestoneInfo> {
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
export { normalizeMilestoneError }
