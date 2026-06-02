import * as Sentry from "@sentry/node"
import { config } from "./config.js"

export function initSentry(): void {
  if (!config.sentryDsn) {
    console.warn("[sentry] SENTRY_DSN not set — error reporting disabled")
    return
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.sentryEnvironment,
    tracesSampleRate: 0.1,
  })

  console.info("[sentry] initialized for environment:", config.sentryEnvironment)
}

export function captureIndexerError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[indexer] error:", error)
  if (config.sentryDsn) {
    Sentry.captureException(error, { extra: context })
  }
}

export async function flushSentry(): Promise<void> {
  if (config.sentryDsn) {
    await Sentry.flush(2000)
  }
}
