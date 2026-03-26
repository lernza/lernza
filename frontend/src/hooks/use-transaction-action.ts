import { useCallback, useState } from "react"

export type TransactionStatus = "idle" | "pending" | "success" | "failure"

export function useTransactionAction() {
  const [status, setStatus] = useState<TransactionStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T> => {
    setStatus("pending")
    setError(null)
    try {
      const result = await action()
      setStatus("success")
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed"
      setStatus("failure")
      setError(message)
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setStatus("idle")
    setError(null)
  }, [])

  return {
    status,
    error,
    isPending: status === "pending",
    isSuccess: status === "success",
    isFailure: status === "failure",
    run,
    reset,
  }
}
