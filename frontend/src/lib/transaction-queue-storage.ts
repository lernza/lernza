/**
 * Transaction Queue Storage Utilities
 * Handles persistence and retrieval of pending transactions from localStorage
 */

import type { QueuedTransaction } from "@/hooks/use-transaction-queue"

const TRANSACTION_QUEUE_STORAGE_KEY = "lernza_transaction_queue"
const TRANSACTION_QUEUE_VERSION = "1.0"

export interface StoredTransactionQueue {
  version: string
  transactions: QueuedTransaction[]
  lastUpdated: number
}

/**
 * Get the current transaction queue from localStorage
 */
export function getStoredTransactionQueue(): QueuedTransaction[] {
  try {
    const stored = localStorage.getItem(TRANSACTION_QUEUE_STORAGE_KEY)
    if (!stored) return []

    const data = JSON.parse(stored) as StoredTransactionQueue
    
    // Validate version compatibility
    if (data.version !== TRANSACTION_QUEUE_VERSION) {
      console.warn(`Transaction queue version mismatch: ${data.version} vs ${TRANSACTION_QUEUE_VERSION}`)
      return []
    }

    // Filter out expired transactions
    const now = Date.now()
    return data.transactions.filter(tx => !tx.expiresAt || tx.expiresAt > now)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to retrieve transaction queue from storage:", error)
    }
    return []
  }
}

/**
 * Store transaction queue to localStorage
 */
export function storeTransactionQueue(transactions: QueuedTransaction[]): boolean {
  try {
    const data: StoredTransactionQueue = {
      version: TRANSACTION_QUEUE_VERSION,
      transactions,
      lastUpdated: Date.now(),
    }
    localStorage.setItem(TRANSACTION_QUEUE_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to store transaction queue:", error)
    }
    return false
  }
}

/**
 * Clear all stored transactions
 */
export function clearStoredTransactionQueue(): boolean {
  try {
    localStorage.removeItem(TRANSACTION_QUEUE_STORAGE_KEY)
    return true
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to clear transaction queue:", error)
    }
    return false
  }
}

/**
 * Get count of stored transactions
 */
export function getStoredTransactionCount(): number {
  return getStoredTransactionQueue().length
}

/**
 * Check if there are any pending transactions in storage
 */
export function hasPendingTransactions(): boolean {
  return getStoredTransactionCount() > 0
}

/**
 * Get transactions that are in a specific phase
 */
export function getTransactionsByPhase(phase: "signing" | "confirming"): QueuedTransaction[] {
  return getStoredTransactionQueue().filter(tx => tx.phase === phase)
}

/**
 * Get the oldest pending transaction
 */
export function getOldestPendingTransaction(): QueuedTransaction | null {
  const transactions = getStoredTransactionQueue()
  if (transactions.length === 0) return null
  
  return transactions.reduce((oldest, current) => 
    current.enqueuedAt < oldest.enqueuedAt ? current : oldest
  )
}

/**
 * Get transactions that are about to expire (within 5 minutes)
 */
export function getExpiringTransactions(withinMs: number = 5 * 60 * 1000): QueuedTransaction[] {
  const now = Date.now()
  return getStoredTransactionQueue().filter(tx => {
    if (!tx.expiresAt) return false
    const timeUntilExpiry = tx.expiresAt - now
    return timeUntilExpiry > 0 && timeUntilExpiry <= withinMs
  })
}

/**
 * Export transactions for backup/debugging
 */
export function exportTransactionQueue(): string {
  const transactions = getStoredTransactionQueue()
  return JSON.stringify(transactions, null, 2)
}

/**
 * Import transactions from backup (use with caution)
 */
export function importTransactionQueue(data: string): boolean {
  try {
    const transactions = JSON.parse(data) as QueuedTransaction[]
    
    // Validate structure
    if (!Array.isArray(transactions)) {
      throw new Error("Invalid transaction queue format")
    }
    
    // Validate each transaction has required fields
    for (const tx of transactions) {
      if (!tx.id || !tx.type || !tx.label || !tx.phase || !tx.enqueuedAt) {
        throw new Error("Invalid transaction structure")
      }
    }
    
    return storeTransactionQueue(transactions)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed to import transaction queue:", error)
    }
    return false
  }
}
