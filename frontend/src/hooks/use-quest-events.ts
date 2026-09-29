import { useEffect, useRef, useCallback, useMemo } from "react"
import * as rpc from "@stellar/stellar-sdk/rpc"
import { xdr } from "@stellar/stellar-sdk"
import { server, withRpcReadThrottle, withTimeout, RPC_TIMEOUT_MS } from "@/lib/contracts/client"
import { queryClient } from "@/lib/query-client"
import { useNotifications } from "@/contexts/notification-context"
import { useUserRole } from "@/hooks/use-user-role"
import { useWallet } from "@/hooks/use-wallet"
import {
  isLearnerSubject,
  resolveViewerRole,
  type ViewerParticipation,
} from "@/lib/notification-audience"
import { contractAddresses } from "@/lib/contracts/config"

/**
 * Known Soroban contract event topics emitted by the lernza contracts.
 * Topics are 4-byte hex-encoded symbols per the Stellar contract event spec.
 */
type EventTopicKey =
  | "milestone_completed"
  | "reward_distributed"
  | "reward_funded"
  | "enrollee_added"
  | "quest_archived"
  | "quest_cancelled"
  | "peer_approved"
  | "certificate_minted"
  | "quest_created"
  | "quest_updated"
  | "creator_verified"
  | "creator_verification_revoked"
  | "admin_transferred"
  | "quest_ttl_extended"
  | "distribution_mode_set"
  | "reward_refunded"
  | "partial_completion"
  | "pending_reward_released"
  | "certificate_mint_failed"
  | "milestone_feedback"
  | "dispute_initiated"
  | "dispute_resolved"

const POLL_INTERVAL_MS = 10_000

function topicHex(symbol: string): string {
  const bytes = new TextEncoder().encode(symbol)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

function decodeScValAddress(val: xdr.ScVal | undefined): string {
  if (!val) return ""
  try {
    return val.address().toString()
  } catch {
    return ""
  }
}

/**
 * A 32-bit limb of an `i128`, as the SDK has exposed it: either a plain
 * `{ low, high }` record or an accessor-bearing object exposing them as
 * methods. The shape has differed across SDK versions, and guessing wrong
 * previously cost every amount in the event stream (see below).
 */
type Int32Limb = { low: number; high: number }

function readLimb(limb: Int32Limb | { low(): number; high(): number }): Int32Limb {
  if (typeof (limb as { low(): number }).low === "function") {
    const accessor = limb as { low(): number; high(): number }
    return { low: accessor.low(), high: accessor.high() }
  }
  return limb as Int32Limb
}

/**
 * Decode a contract `i128` amount.
 *
 * This previously read `parts.hi()` and `parts.lo()` as methods. The SDK
 * returns `{ lo, hi }` as plain records, so every call threw a `TypeError` that
 * the surrounding `try/catch` swallowed and turned into `0n`. The visible effect
 * was that every reward notification — funded, distributed, refunded, and the
 * reward released on a partial completion — reported no amount and fell back to
 * a generic label, with nothing in the log to indicate a bug.
 *
 * Amounts are assembled from the four 32-bit limbs, sign-extended via
 * `BigInt.asIntN` so a negative adjustment does not wrap into a huge positive
 * number.
 */
function decodeScValI128(val: xdr.ScVal | undefined): bigint {
  if (!val) return 0n
  try {
    const parts = val.i128() as unknown as {
      lo: Int32Limb | { low(): number; high(): number }
      hi: Int32Limb | { low(): number; high(): number }
    }
    const hi = readLimb(parts.hi)
    const lo = readLimb(parts.lo)

    const unsigned =
      (BigInt(hi.high) << 96n) | (BigInt(hi.low) << 64n) | (BigInt(lo.high) << 32n) | BigInt(lo.low)
    return BigInt.asIntN(128, unsigned)
  } catch {
    return 0n
  }
}

function decodeScValU32(val: xdr.ScVal | undefined): number {
  if (!val) return 0
  try {
    return val.u32()
  } catch {
    return 0
  }
}

/**
 * Decode a contract-supplied string.
 *
 * Contract payloads carry user-controlled text (a reviewer's comment, a quest
 * title), so a non-string or absent value must not throw or leak a raw
 * `ScVal` debug representation into the UI. `String::from` raises for values
 * that are not `ScVal::String`, and an over-long string is not worth rendering
 * in a toast, so the length is capped.
 */
const MAX_DECODED_STRING_LENGTH = 280

function decodeScValString(val: xdr.ScVal | undefined): string {
  if (!val) return ""
  try {
    return val.str().toString().slice(0, MAX_DECODED_STRING_LENGTH)
  } catch {
    return ""
  }
}

function matchTopic(event: rpc.Api.EventResponse, topicSymbol: string): boolean {
  const hex = topicHex(topicSymbol)
  return event.topic.some(t => {
    try {
      const bytes = t.bytes()
      const eventHex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
      return eventHex === hex
    } catch {
      return false
    }
  })
}

export interface ParsedEvent {
  type: EventTopicKey
  questId?: number
  milestoneId?: number
  enrollee?: string
  amount?: bigint
  ledger: number
  txHash: string
  admin?: string
  creator?: string
  previousAdmin?: string
  newAdmin?: string
  mode?: number
  flatReward?: bigint
  actor?: string
  authority?: string
  criteriaMet?: number
  maxCriteria?: number
  reviewer?: string
  action?: number
  outcome?: number
  /** Reviewer comment from `milestone_feedback`; `""` when absent. */
  comment?: string
}

export function parseEvent(event: rpc.Api.EventResponse): ParsedEvent | null {
  const valVec = event.value.vec()
  const vals = valVec ?? []

  if (matchTopic(event, "milestone_completed")) {
    return {
      type: "milestone_completed",
      questId: decodeScValU32(vals[0]),
      milestoneId: decodeScValU32(vals[1]),
      enrollee: decodeScValAddress(vals[2]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "reward_distributed")) {
    return {
      type: "reward_distributed",
      questId: decodeScValU32(vals[0]),
      milestoneId: decodeScValU32(vals[1]),
      enrollee: decodeScValAddress(vals[2]),
      amount: decodeScValI128(vals[3]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "reward_funded")) {
    return {
      type: "reward_funded",
      questId: decodeScValU32(vals[0]),
      amount: decodeScValI128(vals[2]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "enrollee_added")) {
    return {
      type: "enrollee_added",
      questId: decodeScValU32(vals[0]),
      enrollee: decodeScValAddress(vals[1]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "quest_archived")) {
    return {
      type: "quest_archived",
      questId: decodeScValU32(vals[0]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "quest_cancelled")) {
    return {
      type: "quest_cancelled",
      questId: decodeScValU32(vals[0]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "peer_approved")) {
    return {
      type: "peer_approved",
      questId: decodeScValU32(vals[1]),
      milestoneId: decodeScValU32(vals[0]),
      enrollee: decodeScValAddress(vals[2]),
      amount: decodeScValI128(vals[4]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "certificate_minted")) {
    return {
      type: "certificate_minted",
      questId: decodeScValU32(vals[0]),
      enrollee: decodeScValAddress(vals[1]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "quest_created")) {
    return {
      type: "quest_created",
      questId: decodeScValU32(vals[0]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "quest_updated")) {
    return {
      type: "quest_updated",
      questId: decodeScValU32(vals[0]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "creator_verified")) {
    return {
      type: "creator_verified",
      questId: decodeScValU32(vals[0]),
      admin: decodeScValAddress(vals[1]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "creator_verification_revoked")) {
    return {
      type: "creator_verification_revoked",
      creator: decodeScValAddress(vals[0]),
      admin: decodeScValAddress(vals[1]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "admin_transferred")) {
    return {
      type: "admin_transferred",
      previousAdmin: decodeScValAddress(vals[0]),
      newAdmin: decodeScValAddress(vals[1]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "quest_ttl_extended")) {
    return {
      type: "quest_ttl_extended",
      questId: decodeScValU32(vals[0]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "distribution_mode_set")) {
    return {
      type: "distribution_mode_set",
      questId: decodeScValU32(vals[0]),
      mode: decodeScValU32(vals[1]),
      flatReward: decodeScValI128(vals[2]),
      actor: decodeScValAddress(vals[3]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "reward_refunded")) {
    return {
      type: "reward_refunded",
      questId: decodeScValU32(vals[0]),
      authority: decodeScValAddress(vals[1]),
      amount: decodeScValI128(vals[2]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "partial_completion")) {
    return {
      type: "partial_completion",
      questId: decodeScValU32(vals[0]),
      milestoneId: decodeScValU32(vals[1]),
      enrollee: decodeScValAddress(vals[2]),
      criteriaMet: decodeScValU32(vals[3]),
      maxCriteria: decodeScValU32(vals[4]),
      amount: decodeScValI128(vals[5]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "pending_reward_released")) {
    return {
      type: "pending_reward_released",
      questId: decodeScValU32(vals[0]),
      enrollee: decodeScValAddress(vals[1]),
      amount: decodeScValI128(vals[2]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "certificate_mint_failed")) {
    return {
      type: "certificate_mint_failed",
      questId: decodeScValU32(vals[0]),
      enrollee: decodeScValAddress(vals[1]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "milestone_feedback")) {
    return {
      type: "milestone_feedback",
      questId: decodeScValU32(vals[0]),
      milestoneId: decodeScValU32(vals[1]),
      enrollee: decodeScValAddress(vals[2]),
      reviewer: decodeScValAddress(vals[3]),
      action: decodeScValU32(vals[4]),
      // The reviewer's comment is the sixth and final payload element. It was
      // previously discarded, so a learner was told only that a milestone had
      // been approved or rejected and never saw why — which is the single most
      // useful part of a verification result.
      comment: decodeScValString(vals[5]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "dispute_initiated")) {
    return {
      type: "dispute_initiated",
      questId: decodeScValU32(vals[0]),
      milestoneId: decodeScValU32(vals[1]),
      enrollee: decodeScValAddress(vals[2]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }
  if (matchTopic(event, "dispute_resolved")) {
    return {
      type: "dispute_resolved",
      questId: decodeScValU32(vals[0]),
      milestoneId: decodeScValU32(vals[1]),
      enrollee: decodeScValAddress(vals[2]),
      outcome: decodeScValU32(vals[3]),
      ledger: event.ledger,
      txHash: event.txHash,
    }
  }

  return null
}

function invalidateQuestQueries(parsed: ParsedEvent) {
  const { questId } = parsed
  void queryClient.invalidateQueries({ queryKey: ["quest", questId] })
  void queryClient.invalidateQueries({ queryKey: ["milestones", questId] })
  void queryClient.invalidateQueries({ queryKey: ["enrollees", questId] })
  void queryClient.invalidateQueries({ queryKey: ["milestoneCount", questId] })
  void queryClient.invalidateQueries({ queryKey: ["rewardPool", questId] })
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] })

  if (parsed.type === "creator_verified" || parsed.type === "creator_verification_revoked") {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }
}

function formatAmount(amount: bigint): string {
  const whole = Number(amount / 10_000_000n)
  return `${whole.toLocaleString()} USDC`
}

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export async function fetchQuestHistory(questId: number): Promise<ParsedEvent[]> {
  const contractIds = [
    contractAddresses.quest,
    contractAddresses.milestone,
    contractAddresses.rewards,
  ].filter(Boolean)

  if (contractIds.length === 0) return []

  const topicFilters: rpc.Api.EventFilter[] = [
    { topics: [[topicHex("milestone_completed")]], contractIds },
    { topics: [[topicHex("reward_distributed")]], contractIds },
    { topics: [[topicHex("reward_funded")]], contractIds },
    { topics: [[topicHex("enrollee_added")]], contractIds },
    { topics: [[topicHex("quest_archived")]], contractIds },
    { topics: [[topicHex("quest_cancelled")]], contractIds },
    { topics: [[topicHex("peer_approved")]], contractIds },
    { topics: [[topicHex("certificate_minted")]], contractIds },
    { topics: [[topicHex("partial_completion")]], contractIds },
    { topics: [[topicHex("pending_reward_released")]], contractIds },
    { topics: [[topicHex("certificate_mint_failed")]], contractIds },
    { topics: [[topicHex("milestone_feedback")]], contractIds },
    { topics: [[topicHex("dispute_initiated")]], contractIds },
    { topics: [[topicHex("dispute_resolved")]], contractIds },
  ]

  try {
    // Note: for production, you would handle pagination here if > 10000 events.
    const response = await server.getEvents({
      filters: topicFilters,
      startLedger: 0,
      limit: 10000,
    })

    const parsed = response.events
      .map(parseEvent)
      .filter((e): e is ParsedEvent => e !== null && e.questId === questId)

    // Sort chronologically (oldest to newest by ledger, we can use txHash as secondary)
    return parsed.sort((a, b) => a.ledger - b.ledger)
  } catch (err) {
    console.error("Failed to fetch quest history:", err)
    return []
  }
}

export function useQuestEventStream(enabled: boolean) {
  const cursorRef = useRef<string | null>(null)
  const lastLedgerRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const {
    notifyEnrollment,
    notifyVerification,
    notifyRewardDistribution,
    notifyQuestStatusChange,
    notifyQuestCancellation,
    addToast,
  } = useNotifications()
  const { ownedQuests, enrolledQuests, isLoading: roleLoading } = useUserRole()
  const { address } = useWallet()

  // Snapshot the viewer's participation once per render so the poll loop reads
  // a stable value. These stay arrays: a wallet participates in a handful of
  // quests, so a `Set` would cost more to build than the lookups it saves.
  const participation = useMemo<ViewerParticipation>(
    () => ({
      address,
      ownedQuestIds: ownedQuests.map(q => q.id),
      enrolledQuestIds: enrolledQuests.map(q => q.id),
    }),
    [address, ownedQuests, enrolledQuests]
  )

  const processEvents = useCallback(
    async (events: rpc.Api.EventResponse[]) => {
      for (const raw of events) {
        const parsed = parseEvent(raw)
        if (!parsed) continue

        invalidateQuestQueries(parsed)

        if (!mountedRef.current) return

        // The stream sees the whole network's activity, not just the viewer's.
        // Drop anything the viewer is not a party to before it becomes a toast;
        // this is the difference between a handful of relevant notifications and
        // a toast for every quest that settles.
        const role = resolveViewerRole(parsed, participation)
        if (!role) continue

        // True when the viewer is the account the event is about, i.e. the
        // notification is from the learner's side rather than the creator's.
        const asLearner = isLearnerSubject(parsed, participation)

        switch (parsed.type) {
          case "milestone_completed":
          case "peer_approved": {
            // `peer_approved` is emitted for every approval in a peer-reviewed
            // quest and `milestone_completed` when the milestone closes, so a
            // single approval previously produced two toasts. One
            // verification result is now one notification, and it carries the
            // milestone's criteria context rather than an opaque "quest #7".
            const label = `Milestone #${parsed.milestoneId ?? "?"}`
            if (asLearner) {
              notifyVerification(label, "approved")
            } else {
              addToast({
                title: "Learner Progress",
                message: `${shortenAddress(parsed.enrollee ?? "")} completed ${label.toLowerCase()} on quest #${parsed.questId}.`,
                type: "success",
                category: "verification",
              })
            }
            break
          }
          case "partial_completion": {
            // Partial credit is a verification result too: the criteria were
            // met partially and a pro-rata reward was released. Reporting it
            // as an outright "approved" was wrong, and it also fired both a
            // completion toast and a partial-credit toast for one event.
            const label = `Milestone #${parsed.milestoneId ?? "?"}`
            const criteria = `${parsed.criteriaMet ?? "?"}/${parsed.maxCriteria ?? "?"} criteria met`
            if (asLearner) {
              addToast({
                title: "Partial Credit Awarded",
                message:
                  `${label}: ${criteria}. ` +
                  `${parsed.amount ? `${formatAmount(parsed.amount)} released.` : ""}`.trim(),
                type: "info",
                category: "verification",
              })
            } else {
              addToast({
                title: "Partial Credit Awarded",
                message: `${shortenAddress(parsed.enrollee ?? "")} met ${criteria} on ${label.toLowerCase()} of quest #${parsed.questId}.`,
                type: "info",
                category: "verification",
              })
            }
            break
          }
          case "milestone_feedback": {
            // The reviewer's comment is the substance of the result and was
            // being dropped on the floor; surface it via `notifyVerification`,
            // which appends it to the message.
            const status =
              parsed.action === 0
                ? "approved"
                : parsed.action === 1
                  ? "rejected"
                  : "changes_requested"
            const feedback = parsed.comment || undefined
            if (asLearner) {
              notifyVerification(`Milestone #${parsed.milestoneId ?? "?"}`, status, feedback)
            } else {
              const reviewer = parsed.reviewer ? shortenAddress(parsed.reviewer) : "A reviewer"
              const verb =
                status === "approved"
                  ? "approved"
                  : status === "rejected"
                    ? "rejected"
                    : "requested changes on"
              addToast({
                title: "Reviewer Feedback",
                message: `${reviewer} ${verb} milestone #${parsed.milestoneId ?? "?"} of quest #${parsed.questId} from ${shortenAddress(parsed.enrollee ?? "")}.`,
                type:
                  status === "approved" ? "success" : status === "rejected" ? "warning" : "info",
                category: "verification",
              })
            }
            break
          }
          case "reward_distributed": {
            const amount = parsed.amount ? formatAmount(parsed.amount) : "reward"
            // A payout is the learner's money; the creator gets the same
            // notification but phrased as a distribution they made. Only the
            // account that was actually paid is told it was claimed.
            if (asLearner) {
              notifyRewardDistribution(amount, "claimed")
            } else if (role === "creator" || role === "both") {
              addToast({
                title: "Reward Distributed",
                message: `${amount} paid out to ${shortenAddress(parsed.enrollee ?? "")} on quest #${parsed.questId}.`,
                type: "success",
                category: "reward_distribution",
              })
            }
            break
          }
          case "reward_funded": {
            // Escrow funding is the creator's own action; the learner has no
            // stake in it beyond "the quest can now pay out".
            if (asLearner) {
              notifyRewardDistribution(
                parsed.amount ? formatAmount(parsed.amount) : "tokens",
                "funded"
              )
            }
            break
          }
          case "reward_refunded": {
            if (asLearner) {
              notifyRewardDistribution(
                parsed.amount ? formatAmount(parsed.amount) : "reward",
                "refunded"
              )
            }
            break
          }
          case "enrollee_added": {
            // A creator-only notification. The payload's third slot is the quest
            // owner, so the recipient is resolvable without another chain read.
            // This was previously a generic "Someone joined" toast sent to every
            // connected wallet, categorised as a quest status change.
            notifyEnrollment(`Quest #${parsed.questId}`, parsed.enrollee ?? "", "added")
            break
          }
          case "quest_archived":
            notifyQuestStatusChange(`Quest #${parsed.questId}`, "archived")
            break
          case "quest_cancelled":
            notifyQuestCancellation(`Quest #${parsed.questId}`)
            break
          case "certificate_minted":
            addToast({
              title: "Certificate Minted!",
              message: `A completion certificate was minted for ${shortenAddress(parsed.enrollee ?? "")} on quest #${parsed.questId}.`,
              type: "success",
              category: "verification",
            })
            break
          case "quest_created":
            // Only meaningful to the creator, and `resolveViewerRole` has
            // already confirmed the viewer owns the quest.
            addToast({
              title: "Quest Created",
              message: `Your quest #${parsed.questId} is live.`,
              type: "success",
              category: "quest_status",
            })
            break
          case "quest_updated":
            addToast({
              title: "Quest Updated",
              message: `Quest #${parsed.questId} has been updated.`,
              type: "info",
              category: "quest_status",
            })
            break
          case "creator_verified":
            addToast({
              title: "Creator Verified",
              message: `Creator verification approved for quest #${parsed.questId}.`,
              type: "success",
              category: "quest_status",
            })
            break
          case "creator_verification_revoked":
            addToast({
              title: "Creator Verification Revoked",
              message: `Creator verification revoked for quest #${parsed.questId}.`,
              type: "warning",
              category: "quest_status",
            })
            break
          case "dispute_initiated":
            addToast({
              title: "Dispute Initiated",
              message: `A dispute was opened on milestone #${parsed.milestoneId ?? "?"} (Quest #${parsed.questId}).`,
              type: "warning",
              category: "verification",
            })
            break
          case "dispute_resolved":
            addToast({
              title: "Dispute Resolved",
              message: `Dispute on milestone #${parsed.milestoneId ?? "?"} (Quest #${parsed.questId}) resolved as ${parsed.outcome === 1 ? "overturned" : "upheld"}.`,
              type: parsed.outcome === 1 ? "success" : "info",
              category: "verification",
            })
            break
          case "pending_reward_released":
            if (asLearner) {
              notifyRewardDistribution(
                parsed.amount ? formatAmount(parsed.amount) : "reward",
                "claimed"
              )
            }
            break
          case "certificate_mint_failed":
            addToast({
              title: "Certificate Mint Failed",
              message: `Certificate minting failed for ${shortenAddress(parsed.enrollee ?? "")} on quest #${parsed.questId}. It can be retried.`,
              type: "error",
              category: "verification",
            })
            break
        }
      }
    },
    [
      participation,
      notifyEnrollment,
      notifyVerification,
      notifyRewardDistribution,
      notifyQuestStatusChange,
      notifyQuestCancellation,
      addToast,
    ]
  )

  const poll = useCallback(async () => {
    if (!mountedRef.current) return

    const contractIds = [
      contractAddresses.quest,
      contractAddresses.milestone,
      contractAddresses.rewards,
    ].filter(Boolean)

    const topicFilters: rpc.Api.EventFilter[] = [
      { topics: [[topicHex("milestone_completed")]], contractIds },
      { topics: [[topicHex("reward_distributed")]], contractIds },
      { topics: [[topicHex("reward_funded")]], contractIds },
      { topics: [[topicHex("enrollee_added")]], contractIds },
      { topics: [[topicHex("quest_archived")]], contractIds },
      { topics: [[topicHex("quest_cancelled")]], contractIds },
      { topics: [[topicHex("peer_approved")]], contractIds },
      { topics: [[topicHex("certificate_minted")]], contractIds },
      { topics: [[topicHex("partial_completion")]], contractIds },
      { topics: [[topicHex("pending_reward_released")]], contractIds },
      { topics: [[topicHex("certificate_mint_failed")]], contractIds },
      { topics: [[topicHex("milestone_feedback")]], contractIds },
      { topics: [[topicHex("dispute_initiated")]], contractIds },
      { topics: [[topicHex("dispute_resolved")]], contractIds },
    ]

    try {
      const response = await withRpcReadThrottle("event stream poll", () => {
        const filters = topicFilters
        const limit = 50

        if (cursorRef.current) {
          return withTimeout(
            server.getEvents({ filters, cursor: cursorRef.current, limit }),
            RPC_TIMEOUT_MS,
            "RPC timeout: event stream"
          )
        }

        if (lastLedgerRef.current) {
          return withTimeout(
            server.getEvents({ filters, startLedger: lastLedgerRef.current, limit }),
            RPC_TIMEOUT_MS,
            "RPC timeout: event stream"
          )
        }

        return withTimeout(
          server.getEvents({ filters, startLedger: 0, limit }),
          RPC_TIMEOUT_MS,
          "RPC timeout: event stream"
        )
      })

      if (!mountedRef.current) return

      cursorRef.current = response.cursor

      if (response.events.length > 0) {
        const lastLedger = Math.max(...response.events.map(e => e.ledger))
        lastLedgerRef.current = lastLedger
        await processEvents(response.events)
      }
    } catch (err) {
      if (mountedRef.current) {
        console.warn("[useQuestEventStream] Poll failed, will retry:", err)
      }
    }
  }, [processEvents])

  /**
   * Whether the stream may start polling.
   *
   * Polling must wait for the viewer's participation to resolve. The poll
   * advances its cursor on every response, so a poll that ran while the
   * participation lists were still empty would filter every event out as
   * "not mine" and then advance past them — losing those notifications
   * permanently rather than merely delaying them. Waiting also means the
   * initial backfill from `startLedger: 0` is filtered against real
   * participation instead of an empty snapshot.
   */
  const ready = enabled && !!address && !roleLoading

  useEffect(() => {
    mountedRef.current = true

    if (!ready) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    void poll()

    intervalRef.current = setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [ready, poll])
}
