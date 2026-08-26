import { useEffect, useRef, useCallback } from "react"
import * as rpc from "@stellar/stellar-sdk/rpc"
import { xdr } from "@stellar/stellar-sdk"
import { server, withRpcReadThrottle, withTimeout, RPC_TIMEOUT_MS } from "@/lib/contracts/client"
import { queryClient } from "@/lib/query-client"
import { useNotifications } from "@/contexts/notification-context"
import { env } from "@/lib/env"

/**
 * Known Soroban contract event topics emitted by the lernza contracts.
 * Topics are 4-byte hex-encoded symbols per the Stellar contract event spec.
 */
const TOPICS = {
  milestone_completed: "6d696c6573746f6e655f636f6d706c65746564",
  reward_distributed: "7265776172645f6469737472696275746564",
  reward_funded: "7265776172645f66756e646564",
  enrollee_added: "656e726f6c6c65655f6164646564",
  quest_archived: "71756573745f6172636869766564",
  quest_cancelled: "71756573745f63616e63656c6c6564",
  peer_approved: "706565725f617070726f766564",
  certificate_minted: "63657274696669636174655f6d696e746564",
} as const

type EventTopicKey = keyof typeof TOPICS

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

function decodeScValI128(val: xdr.ScVal | undefined): bigint {
  if (!val) return 0n
  try {
    const parts = val.i128()
    const hi = parts.hi()
    const lo = parts.lo()
    const hiHi = BigInt(hi.high)
    const hiLo = BigInt(hi.low)
    const loHi = BigInt(lo.high)
    const loLo = BigInt(lo.low)
    return (hiHi << 96n) | (hiLo << 64n) | (loHi << 32n) | loLo
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
  questId: number
  milestoneId?: number
  enrollee?: string
  amount?: bigint
  ledger: number
  txHash: string
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
    env.VITE_QUEST_CONTRACT_ID,
    env.VITE_MILESTONE_CONTRACT_ID,
    env.VITE_REWARDS_CONTRACT_ID,
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
    notifyMilestoneCompletion,
    notifyRewardDistribution,
    notifyQuestStatusChange,
    addToast,
  } = useNotifications()

  const processEvents = useCallback(
    async (events: rpc.Api.EventResponse[]) => {
      for (const raw of events) {
        const parsed = parseEvent(raw)
        if (!parsed) continue

        invalidateQuestQueries(parsed)

        if (!mountedRef.current) return

        switch (parsed.type) {
          case "milestone_completed":
            notifyMilestoneCompletion(
              `Milestone #${parsed.milestoneId ?? "?"} (Quest #${parsed.questId})`,
              "approved"
            )
            break
          case "peer_approved":
            notifyMilestoneCompletion(
              `Milestone #${parsed.milestoneId ?? "?"} (Quest #${parsed.questId})`,
              "approved"
            )
            break
          case "reward_distributed":
            notifyRewardDistribution(
              parsed.amount ? formatAmount(parsed.amount) : "reward",
              "claimed"
            )
            break
          case "reward_funded":
            notifyRewardDistribution(
              parsed.amount ? formatAmount(parsed.amount) : "tokens",
              "funded"
            )
            break
          case "enrollee_added":
            addToast({
              title: "New Enrollee",
              message: `Someone joined Quest #${parsed.questId}.`,
              type: "info",
              category: "quest_status",
            })
            break
          case "quest_archived":
            notifyQuestStatusChange(`Quest #${parsed.questId}`, "archived")
            break
          case "quest_cancelled":
            notifyQuestStatusChange(`Quest #${parsed.questId}`, "cancelled")
            break
          case "certificate_minted":
            addToast({
              title: "Certificate Minted!",
              message: `A completion certificate was minted for ${shortenAddress(parsed.enrollee ?? "")}.`,
              type: "success",
              category: "milestone",
            })
            break
        }
      }
    },
    [notifyMilestoneCompletion, notifyRewardDistribution, notifyQuestStatusChange, addToast]
  )

  const poll = useCallback(async () => {
    if (!mountedRef.current) return

    const contractIds = [
      env.VITE_QUEST_CONTRACT_ID,
      env.VITE_MILESTONE_CONTRACT_ID,
      env.VITE_REWARDS_CONTRACT_ID,
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

  useEffect(() => {
    mountedRef.current = true

    if (!enabled) {
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
  }, [enabled, poll])
}
