import { isDev } from "@/lib/env"
import * as Sentry from "@sentry/react"
import { env } from "./env"
import { mapContractError } from "./contract-errors"

export function setupGlobalErrorHandlers() {
  if (typeof window === "undefined") return

  window.addEventListener("unhandledrejection", event => {
    const reason = event.reason
    const error = reason instanceof Error ? reason : new Error(String(reason))

    if (isDev) {
      console.group(
        "%c[GlobalErrorHandler] Unhandled Promise Rejection",
        "color:#e11d48;font-weight:bold"
      )
      console.error(error)
      console.groupEnd()
    }

    // Sentry's browserTracingIntegration captures these automatically, but we
    // also capture explicitly so the hint carries the original reason value.
    if (env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, {
        mechanism: { type: "onunhandledrejection", handled: false },
      })
    }
  })

  window.addEventListener("error", event => {
    if (isDev) {
      console.group("%c[GlobalErrorHandler] Uncaught Error", "color:#e11d48;font-weight:bold")
      console.error(event.error ?? event.message)
      console.groupEnd()
    }
    // Uncaught errors are already captured by Sentry's global error handler.
  })
}

/**
 * Wraps a contract call (buildTx + signAndSubmit) so preflight simulation
 * failures -- thrown by server.prepareTransaction() inside each client's
 * buildTx() *before* signAndSubmit ever prompts the wallet -- and post-submit
 * failures both surface as a plain-language message rather than a raw
 * HostError/simulation dump. Issue #1480: because buildTx() is always
 * awaited before signAndSubmit() is called, a thrown simulation error here
 * already means the wallet was never asked to sign -- this only improves
 * the message, not the skip-signing behavior (which was already correct).
 *
 * `scope` is the contract being called (a scope name or contract address).
 * Pass it whenever the caller knows which contract it is talking to: error
 * codes are only unique *within* a contract, so an unscoped lookup has to
 * report an ambiguous code verbatim rather than risk the wrong message.
 */
export async function safeContractCall<T>(fn: () => Promise<T>, scope?: string | null): Promise<T> {
  try {
    return await fn()
  } catch (err: unknown) {
    const raw = err instanceof Error ? err : new Error(String(err))

    if (
      raw.message.includes("HostError") ||
      raw.message.includes("Error(Contract") ||
      raw.message.includes("transaction simulation failed")
    ) {
      // Prefer the same contract-error-code -> human message lookup used
      // elsewhere (contract-errors.ts) so a failed simulation and a failed
      // submission report the exact same wording for the exact same
      // underlying contract error.
      const mapped = mapContractError(raw.message, scope)
      raw.message = mapped !== raw.message ? mapped : `Contract call failed: ${raw.message}`
    } else if (
      raw.message.includes("could not detect network") ||
      raw.message.includes("failed to fetch")
    ) {
      raw.message = "Network error: could not reach the Stellar network. Check your connection."
    }

    throw raw
  }
}

/**
 * Binds a contract scope to `safeContractCall`.
 *
 * Every write in a client module targets the same contract, so each module
 * wraps this once instead of repeating the scope at every call site — and
 * forgetting one is exactly how an unscoped lookup creeps back in.
 *
 * @example
 * const safeQuestCall = scopedContractCall("quest")
 * return safeQuestCall(async () => { ... })
 */
export function scopedContractCall(scope: string): <T>(fn: () => Promise<T>) => Promise<T> {
  return fn => safeContractCall(fn, scope)
}
