/**
 * Hook for managing transaction timebounds validation
 * Provides utilities to check if transactions are still valid for submission
 */

import { useCallback, useEffect, useState } from "react"
import { Transaction } from "@stellar/stellar-sdk"
import {
  isTransactionTimeboundsValid,
  getTransactionTimebounds,
  type TransactionTimebounds,
} from "@/lib/contracts/client"

export interface TimeboundsStatus {
  isValid: boolean
  reason?: string
  timeRemaining?: number // milliseconds until expiry
  expiresAt?: Date
}

/**
 * Hook to check and monitor transaction timebounds
 */
export function useTransactionTimebounds(tx: Transaction | null) {
  const [status, setStatus] = useState<TimeboundsStatus>({ isValid: true })

  const checkTimebounds = useCallback(() => {
    if (!tx) {
      setStatus({ isValid: true })
      return
    }

    const timebounds = getTransactionTimebounds(tx)
    if (!timebounds) {
      setStatus({ isValid: true })
      return
    }

    const isValid = isTransactionTimeboundsValid(timebounds)
    const now = Math.floor(Date.now() / 1000)

    if (!isValid) {
      let reason = "Transaction timebounds are invalid"
      if (now < timebounds.minTime) {
        reason = `Transaction is not yet valid. Valid from ${new Date(timebounds.minTime * 1000).toISOString()}`
      } else if (timebounds.maxTime > 0 && now > timebounds.maxTime) {
        reason = `Transaction has expired. Valid until ${new Date(timebounds.maxTime * 1000).toISOString()}`
      }
      setStatus({ isValid: false, reason })
    } else {
      const timeRemaining =
        timebounds.maxTime > 0 ? (timebounds.maxTime - now) * 1000 : undefined
      const expiresAt = timebounds.maxTime > 0 ? new Date(timebounds.maxTime * 1000) : undefined

      setStatus({
        isValid: true,
        timeRemaining,
        expiresAt,
      })
    }
  }, [tx])

  // Check timebounds immediately and set up interval to check periodically
  useEffect(() => {
    checkTimebounds()

    // Check every 10 seconds to catch expiring transactions
    const interval = setInterval(checkTimebounds, 10000)

    return () => clearInterval(interval)
  }, [checkTimebounds])

  return status
}

/**
 * Hook to get formatted time remaining for a transaction
 */
export function useTransactionTimeRemaining(tx: Transaction | null): string {
  const status = useTransactionTimebounds(tx)

  return useCallback(() => {
    if (!status.timeRemaining) return "No expiry"

    const seconds = Math.floor(status.timeRemaining / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h remaining`
    if (hours > 0) return `${hours}h ${minutes % 60}m remaining`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s remaining`
    return `${seconds}s remaining`
  }, [status.timeRemaining])()
}

/**
 * Hook to warn when transaction is about to expire
 */
export function useTransactionExpiryWarning(
  tx: Transaction | null,
  warningThresholdMs: number = 5 * 60 * 1000 // 5 minutes
): boolean {
  const status = useTransactionTimebounds(tx)

  return (
    status.isValid &&
    status.timeRemaining !== undefined &&
    status.timeRemaining <= warningThresholdMs
  )
}
