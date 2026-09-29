/**
 * Offline transaction-intent queue — issue #1626.
 *
 * The existing `use-transaction-queue` tracks already-signed/submitted Stellar
 * transactions. This module covers the step before that: when the user attempts
 * a quest transaction (enrol, verify, claim) while `navigator.onLine === false`,
 * the intent is persisted here and retried once the `online` event fires, so no
 * attempt is silently lost while disconnected.
 */

import { isDev } from "@/lib/env"

export interface OfflineTransactionIntent {
  id: string
  label: string
  kind: "enrol" | "verify" | "claim" | "fund" | "other"
  questId?: number
  payload?: Record<string, unknown>
  queuedAt: number
}

const OFFLINE_TX_QUEUE_KEY = "lernza_offline_tx_queue"
const OFFLINE_TX_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function readQueue(): OfflineTransactionIntent[] {
  try {
    const raw = localStorage.getItem(OFFLINE_TX_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OfflineTransactionIntent[]
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed.filter(intent => now - intent.queuedAt <= OFFLINE_TX_TTL_MS)
  } catch {
    if (isDev) console.warn("[offline-queue] failed to read queued intents")
    return []
  }
}

function writeQueue(intents: OfflineTransactionIntent[]): void {
  try {
    localStorage.setItem(OFFLINE_TX_QUEUE_KEY, JSON.stringify(intents))
  } catch {
    if (isDev) console.warn("[offline-queue] failed to persist queued intents")
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `offline-tx-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

/**
 * Queue a transaction attempt made while offline for retry on reconnect.
 * Returns the queued intent id.
 */
export function queueOfflineTransaction(intent: Omit<OfflineTransactionIntent, "id" | "queuedAt">): string {
  const entry: OfflineTransactionIntent = {
    ...intent,
    id: makeId(),
    queuedAt: Date.now(),
  }
  const queue = readQueue()
  queue.push(entry)
  writeQueue(queue)
  return entry.id
}

/**
 * List non-expired queued intents, oldest first.
 */
export function getQueuedOfflineTransactions(): OfflineTransactionIntent[] {
  return readQueue().sort((a, b) => a.queuedAt - b.queuedAt)
}

/**
 * Remove a single intent after it has been retried (successfully or not).
 */
export function removeOfflineTransaction(id: string): void {
  writeQueue(readQueue().filter(intent => intent.id !== id))
}

/**
 * Drop the whole offline queue, e.g. after a successful bulk retry.
 */
export function clearOfflineTransactionQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_TX_QUEUE_KEY)
  } catch {
    // Ignore cleanup failures.
  }
}

/**
 * Retry every queued intent with the provided handler, removing each intent
 * that the handler reports as settled. Intents whose handler throws are kept
 * for the next reconnect so a single failing retry never drops the queue.
 */
export async function flushOfflineTransactionQueue(
  retry: (intent: OfflineTransactionIntent) => Promise<boolean>
): Promise<{ retried: number; settled: number }> {
  const queued = getQueuedOfflineTransactions()
  let settled = 0
  for (const intent of queued) {
    try {
      const done = await retry(intent)
      if (done) {
        removeOfflineTransaction(intent.id)
        settled += 1
      }
    } catch {
      if (isDev) console.warn("[offline-queue] retry failed, keeping intent", intent.id)
    }
  }
  return { retried: queued.length, settled }
}
