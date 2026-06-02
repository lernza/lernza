import { useCallback, useRef, useState, useEffect } from "react"

export type TransactionQueuePhase = "signing" | "confirming"

export interface QueuedTransaction<TType extends string = string, TMeta = unknown> {
  id: string
  type: TType
  label: string
  phase: TransactionQueuePhase
  meta: TMeta
  txHash?: string
  enqueuedAt: number // Timestamp when transaction was added
  expiresAt?: number // Optional expiration time (in milliseconds)
}

const TRANSACTION_QUEUE_STORAGE_KEY = "lernza_transaction_queue"
const DEFAULT_TRANSACTION_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/**
 * Serialize transactions for localStorage
 */
function serializeTransactions<TType extends string, TMeta>(
  transactions: QueuedTransaction<TType, TMeta>[]
): string {
  return JSON.stringify(transactions)
}

/**
 * Deserialize transactions from localStorage
 */
function deserializeTransactions<TType extends string = string, TMeta = unknown>(
  data: string
): QueuedTransaction<TType, TMeta>[] {
  try {
    return JSON.parse(data) as QueuedTransaction<TType, TMeta>[]
  } catch {
    return []
  }
}

/**
 * Load transactions from localStorage
 */
function loadTransactionsFromStorage<TType extends string = string, TMeta = unknown>(): QueuedTransaction<TType, TMeta>[] {
  try {
    const stored = localStorage.getItem(TRANSACTION_QUEUE_STORAGE_KEY)
    if (!stored) return []
    
    const transactions = deserializeTransactions<TType, TMeta>(stored)
    
    // Filter out expired transactions
    const now = Date.now()
    return transactions.filter(tx => !tx.expiresAt || tx.expiresAt > now)
  } catch {
    return []
  }
}

/**
 * Save transactions to localStorage
 */
function saveTransactionsToStorage<TType extends string, TMeta>(
  transactions: QueuedTransaction<TType, TMeta>[]
): void {
  try {
    localStorage.setItem(TRANSACTION_QUEUE_STORAGE_KEY, serializeTransactions(transactions))
  } catch {
    // Storage unavailable — fail silently
    if (import.meta.env.DEV) {
      console.warn("Failed to persist transaction queue to localStorage")
    }
  }
}

/**
 * Clear all transactions from localStorage
 */
function clearTransactionsFromStorage(): void {
  try {
    localStorage.removeItem(TRANSACTION_QUEUE_STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

export function useTransactionQueue<
  TType extends string = string,
  TMeta = Record<string, never>,
>(options?: { persistToStorage?: boolean; defaultTTL?: number }) {
  const { persistToStorage = true, defaultTTL = DEFAULT_TRANSACTION_TTL } = options || {}
  
  const [transactions, setTransactions] = useState<QueuedTransaction<TType, TMeta>[]>(() => {
    if (persistToStorage) {
      return loadTransactionsFromStorage<TType, TMeta>()
    }
    return []
  })
  
  const counterRef = useRef(0)
  const isInitializedRef = useRef(false)

  // Persist to localStorage whenever transactions change
  useEffect(() => {
    if (persistToStorage && isInitializedRef.current) {
      saveTransactionsToStorage(transactions)
    }
    isInitializedRef.current = true
  }, [transactions, persistToStorage])

  const enqueue = useCallback(
    (transaction: Omit<QueuedTransaction<TType, TMeta>, "id" | "enqueuedAt">) => {
      const id = `queued-tx-${++counterRef.current}`
      const now = Date.now()
      const newTransaction: QueuedTransaction<TType, TMeta> = {
        ...transaction,
        id,
        enqueuedAt: now,
        expiresAt: transaction.expiresAt || now + defaultTTL,
      }
      setTransactions(prev => [...prev, newTransaction])
      return id
    },
    [defaultTTL]
  )

  const update = useCallback(
    (id: string, patch: Partial<Omit<QueuedTransaction<TType, TMeta>, "id" | "enqueuedAt">>) => {
      setTransactions(prev =>
        prev.map(tx => (tx.id === id ? { ...tx, ...patch } : tx))
      )
    },
    []
  )

  const remove = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id))
  }, [])

  const clear = useCallback(() => {
    setTransactions([])
    if (persistToStorage) {
      clearTransactionsFromStorage()
    }
  }, [persistToStorage])

  /**
   * Check if a transaction has expired based on its timebounds
   */
  const isExpired = useCallback((transaction: QueuedTransaction<TType, TMeta>): boolean => {
    if (!transaction.expiresAt) return false
    return Date.now() > transaction.expiresAt
  }, [])

  /**
   * Get all non-expired transactions
   */
  const getValidTransactions = useCallback((): QueuedTransaction<TType, TMeta>[] => {
    return transactions.filter(tx => !isExpired(tx))
  }, [transactions, isExpired])

  /**
   * Remove all expired transactions
   */
  const removeExpiredTransactions = useCallback(() => {
    setTransactions(prev => prev.filter(tx => !isExpired(tx)))
  }, [isExpired])

  return {
    transactions,
    enqueue,
    update,
    remove,
    clear,
    isExpired,
    getValidTransactions,
    removeExpiredTransactions,
  }
}
