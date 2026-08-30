import { isDev } from "@/lib/env"

/**
 * Persists in-flight transaction hashes to localStorage (issue #1478), so a
 * page reload or close while a wallet transaction is awaiting confirmation
 * doesn't lose track of it. Deliberately stores only a txHash, a
 * human-readable label, and a timestamp — never signed XDR, keys, or wallet
 * secrets.
 */
export interface PendingTransaction {
  txHash: string
  label: string
  submittedAt: number
}

const STORAGE_KEY = "lernza_pending_transactions"

function readAll(): PendingTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (tx): tx is PendingTransaction =>
        typeof tx?.txHash === "string" && typeof tx?.label === "string" && typeof tx?.submittedAt === "number"
    )
  } catch (error) {
    if (isDev) console.warn("Failed to read pending transactions from storage:", error)
    return []
  }
}

function writeAll(transactions: PendingTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  } catch (error) {
    if (isDev) console.warn("Failed to persist pending transactions to storage:", error)
  }
}

export function getPendingTransactions(): PendingTransaction[] {
  return readAll()
}

export function addPendingTransaction(tx: PendingTransaction): void {
  const existing = readAll().filter(t => t.txHash !== tx.txHash)
  writeAll([...existing, tx])
}

export function removePendingTransaction(txHash: string): void {
  const remaining = readAll().filter(t => t.txHash !== txHash)
  writeAll(remaining)
}

export function clearPendingTransactions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore — nothing to clear if storage is unavailable.
  }
}
