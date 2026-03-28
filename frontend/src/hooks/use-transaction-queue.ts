import { useCallback, useRef, useState } from "react"

export type TransactionQueuePhase = "signing" | "confirming"

export interface QueuedTransaction<TType extends string = string, TMeta = unknown> {
  id: string
  type: TType
  label: string
  phase: TransactionQueuePhase
  meta: TMeta
  txHash?: string
}

export function useTransactionQueue<
  TType extends string = string,
  TMeta = Record<string, never>,
>() {
  const [transactions, setTransactions] = useState<QueuedTransaction<TType, TMeta>[]>([])
  const counterRef = useRef(0)

  const enqueue = useCallback((transaction: Omit<QueuedTransaction<TType, TMeta>, "id">) => {
    const id = `queued-tx-${++counterRef.current}`
    setTransactions(prev => [...prev, { ...transaction, id }])
    return id
  }, [])

  const update = useCallback(
    (id: string, patch: Partial<Omit<QueuedTransaction<TType, TMeta>, "id">>) => {
      setTransactions(prev => prev.map(tx => (tx.id === id ? { ...tx, ...patch } : tx)))
    },
    []
  )

  const remove = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id))
  }, [])

  return {
    transactions,
    enqueue,
    update,
    remove,
  }
}
