
export function setupGlobalErrorHandlers() {
  if (typeof window === "undefined") return

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason
    const error = reason instanceof Error ? reason : new Error(String(reason))

    if (import.meta.env.DEV) {
      console.group(
        "%c[GlobalErrorHandler] Unhandled Promise Rejection",
        "color:#e11d48;font-weight:bold"
      )
      console.error(error)
      console.groupEnd()
    }
  })

  window.addEventListener("error", (event) => {
    if (import.meta.env.DEV) {
      console.group(
        "%c[GlobalErrorHandler] Uncaught Error",
        "color:#e11d48;font-weight:bold"
      )
      console.error(event.error ?? event.message)
      console.groupEnd()
    }
  })
}

export async function safeContractCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err: unknown) {
    const raw = err instanceof Error ? err : new Error(String(err))

    if (
      raw.message.includes("HostError") ||
      raw.message.includes("Error(Contract") ||
      raw.message.includes("transaction simulation failed")
    ) {
      const match = raw.message.match(/Error\(Contract, #(\d+)\)/)
      raw.message = match ? `Contract error #${match[1]}: ${raw.message}` : `Contract call failed: ${raw.message}`
    } else if (
      raw.message.includes("could not detect network") ||
      raw.message.includes("failed to fetch")
    ) {
      raw.message = `Network error: ${raw.message}`
    }

    throw raw
  }
}
