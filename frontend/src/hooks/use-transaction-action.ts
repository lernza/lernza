import { useCallback, useEffect, useRef, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { pushToast } from "@/lib/notifications"
import { classifyError, mapContractError, type ErrorKind } from "@/lib/contract-errors"

export type TransactionStatus = "idle" | "pending" | "confirming" | "success" | "failure"

export interface TransactionActionRunOptions {
  onSubmitted?: (txHash: string) => void
}

export interface TransactionResult {
  status: "SUCCESS" | "FAILED" | "PENDING"
  txHash: string
  error?: string
}

function classifyTransactionError(message: string): ErrorKind {
  return classifyError(message)
}

function humanizeTransactionError(message: string): string {
  const lower = message.toLowerCase()

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("cancel")
  ) {
    return "Transaction was cancelled by the user."
  }
  if (lower.includes("insufficient") && lower.includes("fund")) {
    return "Insufficient funds for this transaction. Please add XLM to your account."
  }
  if (lower.includes("network mismatch") || lower.includes("wrong network")) {
    return "Freighter is on the wrong network. Switch back to the correct network in Freighter."
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The request timed out. Check your connection and try again."
  }
  if (lower.includes("simulate") || lower.includes("simulation failed")) {
    return mapContractError(message)
  }
  if (lower.includes("error(contract")) {
    return mapContractError(message)
  }
  if (lower.includes("signing failed")) {
    return "Transaction signing failed. Make sure Freighter is unlocked."
  }
  if (lower.includes("account changed")) {
    return "Account changed after signing. Please re-confirm."
  }
  if (lower.includes("duplicate")) {
    return "This transaction was already submitted. Please wait a moment."
  }
  if (lower.includes("try again later") || lower.includes("network is busy")) {
    return "The network is busy. Please try again in a moment."
  }
  if (classifyTransactionError(message) === "network") {
    return "Network error: Could not reach the Stellar network. Check your connection."
  }

  return message
}

export function useTransactionAction(options?: { showToast?: boolean }) {
  const showToast = options?.showToast ?? true
  const [status, setStatus] = useState<TransactionStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<unknown>(null)
  const mountedRef = useRef(true)
  const { connected, wrongNetwork, expectedNetworkName } = useWallet()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(
    async <T>(action: (options: TransactionActionRunOptions) => Promise<T>): Promise<T> => {
      if (!connected) {
        const msg = "Wallet is not connected. Please connect your wallet first."
        if (showToast) pushToast({ message: msg, type: "error", duration: 5000 })
        setError(msg)
        throw new Error(msg)
      }

      if (wrongNetwork) {
        const msg = `Transaction blocked: Freighter is on the wrong network. Switch Freighter to ${expectedNetworkName} and try again.`
        if (showToast) pushToast({ message: msg, type: "error", duration: 6000 })
        setError(msg)
        throw new Error(msg)
      }

      setStatus("pending")
      setError(null)
      setData(null)

      try {
        const result = await action({
          onSubmitted: () => {
            if (mountedRef.current) setStatus("confirming")
          },
        })

        if (mountedRef.current) {
          setStatus("success")
          setData(result)
        }

        if (showToast) {
          pushToast({
            message: "Transaction confirmed successfully!",
            type: "success",
            duration: 4000,
          })
        }

        return result
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : "Transaction failed"
        const friendly = humanizeTransactionError(raw)

        if (mountedRef.current) {
          setStatus("failure")
          setError(friendly)
        }

        if (showToast) {
          pushToast({
            message: friendly,
            type: "error",
            duration: 6000,
          })
        }

        throw new Error(friendly)
      }
    },
    [connected, expectedNetworkName, showToast, wrongNetwork]
  )

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setStatus("idle")
      setError(null)
      setData(null)
    }
  }, [])

  return {
    status,
    error,
    data,
    isPending: status === "pending" || status === "confirming",
    isConfirming: status === "confirming",
    isSuccess: status === "success",
    isFailure: status === "failure",
    run,
    reset,
  }
}
