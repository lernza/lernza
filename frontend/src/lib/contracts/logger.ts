/**
 * Structured logger for contract call lifecycles.
 *
 * Each call emits a breadcrumb to Sentry (when configured) and a structured
 * entry to the console in dev. The shape mirrors the fields described in the
 * feature spec: { txHash, contract, fn, args, durationMs, result }.
 */
import * as Sentry from "@sentry/react"
import { env } from "../env"

export interface ContractLogEntry {
  contract: string
  fn: string
  /** Serialisable summary of call arguments (no raw XDR blobs). */
  args?: Record<string, unknown>
  txHash?: string
  durationMs?: number
  result: "success" | "failed" | "error"
  error?: string
}

function addSentryBreadcrumb(entry: ContractLogEntry) {
  if (!env.VITE_SENTRY_DSN) return
  Sentry.addBreadcrumb({
    category: "contract",
    message: `${entry.contract}.${entry.fn}`,
    level: entry.result === "error" || entry.result === "failed" ? "error" : "info",
    data: {
      txHash: entry.txHash,
      durationMs: entry.durationMs,
      result: entry.result,
      error: entry.error,
      ...entry.args,
    },
  })
}

export function logContractCall(entry: ContractLogEntry) {
  addSentryBreadcrumb(entry)

  if (import.meta.env.DEV) {
    const prefix = `[contract:${entry.contract}] ${entry.fn}`
    if (entry.result === "success") {
      console.info(prefix, { ...entry })
    } else {
      console.warn(prefix, { ...entry })
    }
  }
}

/**
 * Wraps an async contract operation and logs a structured entry on completion.
 *
 * @param contract  Short contract name, e.g. "quest" or "milestone"
 * @param fn        Method name, e.g. "create_quest"
 * @param args      Serialisable argument summary (omit raw XDR)
 * @param operation The async function to execute
 */
export async function withContractLogging<T>(
  contract: string,
  fn: string,
  args: Record<string, unknown>,
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const value = await operation()
    logContractCall({
      contract,
      fn,
      args,
      durationMs: Date.now() - start,
      result: "success",
    })
    return value
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err)
    logContractCall({
      contract,
      fn,
      args,
      durationMs: Date.now() - start,
      result: "error",
      error,
    })
    throw err
  }
}
