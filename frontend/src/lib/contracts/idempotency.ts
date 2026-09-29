/**
 * Frontend Transaction Idempotency Safeguards.
 * Prevents duplicate wallet prompts and duplicate contract submissions
 * when users double-click buttons, refresh the browser, or retry while
 * a transaction is in-flight.
 */
import type { Transaction } from "@stellar/stellar-sdk"
import { TransactionStatus, type TransactionResult } from "./client"

const IDEMPOTENCY_STORAGE_KEY = "lernza_tx_idempotency_cache"
const DEFAULT_STORAGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface IdempotencyRecord {
  idempotencyKey: string
  txHash?: string
  status: "IN_FLIGHT" | "SUCCESS" | "FAILED"
  result?: TransactionResult
  createdAt: number
  expiresAt: number
}

export class TransactionIdempotencyManager {
  private inFlightMap = new Map<string, Promise<TransactionResult>>()

  /**
   * Generates a deterministic idempotency key from a Transaction envelope or explicit action payload
   */
  deriveIdempotencyKey(tx: Transaction, customKey?: string): string {
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim()
    }

    try {
      const source = tx.source
      const seq = tx.sequence
      const opTypes = tx.operations.map(op => op.type).join(":")
      return `tx_${source}_${seq}_${opTypes}`
    } catch {
      return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    }
  }

  /**
   * Checks if a transaction with the given key is currently in-flight
   */
  isInFlight(key: string): boolean {
    return this.inFlightMap.has(key)
  }

  /**
   * Retrieves the active in-flight promise for deduplicating calls
   */
  getInFlight(key: string): Promise<TransactionResult> | undefined {
    return this.inFlightMap.get(key)
  }

  /**
   * Checks local/session storage for recently submitted transactions
   */
  getStoredSubmission(key: string): IdempotencyRecord | null {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return null
    }

    try {
      const raw = sessionStorage.getItem(`${IDEMPOTENCY_STORAGE_KEY}_${key}`)
      if (!raw) return null
      const parsed = JSON.parse(raw) as IdempotencyRecord
      if (Date.now() > parsed.expiresAt) {
        sessionStorage.removeItem(`${IDEMPOTENCY_STORAGE_KEY}_${key}`)
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  /**
   * Saves a transaction execution record to session storage
   */
  storeSubmission(
    key: string,
    result: TransactionResult,
    ttlMs: number = DEFAULT_STORAGE_TTL_MS
  ): void {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return
    }

    try {
      const now = Date.now()
      const isSuccess =
        result.status === TransactionStatus.Success ||
        String(result.status).toLowerCase() === "success"
      const record: IdempotencyRecord = {
        idempotencyKey: key,
        txHash: result.txHash,
        status: isSuccess ? "SUCCESS" : "FAILED",
        result,
        createdAt: now,
        expiresAt: now + ttlMs,
      }
      sessionStorage.setItem(`${IDEMPOTENCY_STORAGE_KEY}_${key}`, JSON.stringify(record))
    } catch (err) {
      // Storage quota or privacy mode error; fail open
      console.warn("[IdempotencyManager] Failed to cache submission record:", err)
    }
  }

  /**
   * Executes a transaction submission guarded by idempotency locks.
   * If an identical key is already in-flight, re-uses the active promise instead of
   * prompting the wallet again.
   */
  async executeIdempotent(
    key: string,
    action: () => Promise<TransactionResult>,
    ttlMs: number = DEFAULT_STORAGE_TTL_MS
  ): Promise<TransactionResult> {
    // 1. If an execution with this key is already active, return the in-flight promise
    const existing = this.inFlightMap.get(key)
    if (existing) {
      return existing
    }

    // 2. If already completed in session cache, return cached result to avoid duplicate prompt
    const cached = this.getStoredSubmission(key)
    if (cached && cached.result && cached.status === "SUCCESS") {
      return cached.result
    }

    // 3. Register in-flight promise
    const promise = (async () => {
      try {
        const result = await action()
        const isSuccess =
          result.status === TransactionStatus.Success ||
          String(result.status).toLowerCase() === "success"
        if (isSuccess) {
          this.storeSubmission(key, result, ttlMs)
        }
        return result
      } finally {
        this.inFlightMap.delete(key)
      }
    })()

    this.inFlightMap.set(key, promise)
    return promise
  }

  /**
   * Clears in-flight locks and stored records for a key
   */
  clearKey(key: string): void {
    this.inFlightMap.delete(key)
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.removeItem(`${IDEMPOTENCY_STORAGE_KEY}_${key}`)
      } catch {
        // ignore
      }
    }
  }
}

export const idempotencyManager = new TransactionIdempotencyManager()
