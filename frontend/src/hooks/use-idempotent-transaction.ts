import { useState, useCallback, useRef } from "react"
import { idempotencyManager } from "@/lib/contracts/idempotency"
import { TransactionStatus, type TransactionResult } from "@/lib/contracts/client"

export interface UseIdempotentTransactionOptions {
  idempotencyKey?: string
  ttlMs?: number
  onSuccess?: (result: TransactionResult) => void
  onError?: (error: string) => void
}

export interface UseIdempotentTransactionReturn {
  isSubmitting: boolean
  error: string | null
  submit: (
    action: () => Promise<TransactionResult>,
    customKey?: string
  ) => Promise<TransactionResult | null>
  reset: () => void
}

/**
 * React hook to guard form and button submissions against double-clicks,
 * duplicate wallet triggers, and in-flight re-entries.
 */
export function useIdempotentTransaction(
  options: UseIdempotentTransactionOptions = {}
): UseIdempotentTransactionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeKeyRef = useRef<string | null>(null)

  const submit = useCallback(
    async (
      action: () => Promise<TransactionResult>,
      customKey?: string
    ): Promise<TransactionResult | null> => {
      const key = customKey || options.idempotencyKey || `action_${Date.now()}`

      if (idempotencyManager.isInFlight(key) || isSubmitting) {
        // Suppress duplicate click / trigger while in flight
        return idempotencyManager.getInFlight(key) || null
      }

      setIsSubmitting(true)
      setError(null)
      activeKeyRef.current = key

      try {
        const result = await idempotencyManager.executeIdempotent(
          key,
          action,
          options.ttlMs
        )

        const isSuccess =
          result.status === TransactionStatus.Success ||
          String(result.status).toLowerCase() === "success"

        if (isSuccess) {
          options.onSuccess?.(result)
        } else if (result.error) {
          setError(result.error)
          options.onError?.(result.error)
        }

        return result
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaction failed"
        setError(msg)
        options.onError?.(msg)
        return null
      } finally {
        setIsSubmitting(false)
        activeKeyRef.current = null
      }
    },
    [isSubmitting, options]
  )

  const reset = useCallback(() => {
    if (activeKeyRef.current) {
      idempotencyManager.clearKey(activeKeyRef.current)
    }
    setIsSubmitting(false)
    setError(null)
    activeKeyRef.current = null
  }, [])

  return {
    isSubmitting,
    error,
    submit,
    reset,
  }
}
