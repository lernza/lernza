import * as Sentry from "@sentry/react"
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals"
import type { Metric } from "web-vitals"

/**
 * Fire a custom event to Vercel Analytics.
 * Uses the `window.va` object injected by @vercel/analytics.
 */
export function track(event: string, data: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") {
    // @ts-expect-error - va is injected by Vercel Analytics
    window.va?.track(event, data)
  }
}

/**
 * Register web-vitals observers.
 * Each metric is forwarded to Sentry (as a span measurement on the active page-load
 * transaction created by browserTracingIntegration) and to Vercel Analytics as a
 * custom event so both dashboards show perf trends.
 *
 * Call once at app startup in production only.
 */
export function reportWebVitals() {
  const report = ({ name, value }: Metric) => {
    const unit = name === "CLS" ? "ratio" : "millisecond"
    Sentry.setMeasurement(name, value, unit)
    track("web_vitals", { metric: name, value: Math.round(value) })
  }

  onCLS(report)
  onINP(report)
  onLCP(report)
  onFCP(report)
  onTTFB(report)
}

// ---------------------------------------------------------------------------
// Issue #1465 – Observability for failed contract interactions
// ---------------------------------------------------------------------------

export interface ContractFailureContext {
  /** The contract method that was invoked, e.g. "verify_completion". */
  method: string
  /** Soroban network identifier, e.g. "TESTNET" or "MAINNET". */
  network: string
  /** Sanitized error class / category (no raw keys or PII). */
  errorClass: "wallet" | "network" | "contract" | "not_found" | "unknown"
  /** Transaction hash when the submission reached the network before failing. */
  txHash?: string
  /** Numeric Soroban contract error code, if parsed from the revert message. */
  contractErrorCode?: number
}

/**
 * Records a failed contract simulation or transaction submission.
 *
 * - Sends a structured event to Vercel Analytics for dashboard trending.
 * - Forwards to Sentry as a breadcrumb on the active transaction so the full
 *   request context is available for diagnosis.
 *
 * Only sanitized, non-PII fields are captured. Raw wallet addresses and
 * private error messages are intentionally excluded.
 *
 * @example
 * ```ts
 * trackContractFailure({
 *   method: "verify_completion",
 *   network: "TESTNET",
 *   errorClass: "contract",
 *   contractErrorCode: 14,
 * })
 * ```
 */
export function trackContractFailure(ctx: ContractFailureContext): void {
  const payload: Record<string, unknown> = {
    method: ctx.method,
    network: ctx.network,
    error_class: ctx.errorClass,
    ...(ctx.txHash !== undefined && { tx_hash: ctx.txHash }),
    ...(ctx.contractErrorCode !== undefined && { contract_error_code: ctx.contractErrorCode }),
  }

  // Vercel Analytics – appears in the "Events" dashboard
  track("contract_interaction_failed", payload)

  // Sentry – adds a breadcrumb visible on the active transaction
  Sentry.addBreadcrumb({
    category: "contract",
    message: `contract_interaction_failed: ${ctx.method}`,
    level: "error",
    data: payload,
  })
}

/**
 * Analytics tracking helpers for user engagement & quest activities (Issue #1257).
 */
export const analytics = {
  trackQuestEnroll(questId: string) {
    track("quest_enroll", { questId, timestamp: Date.now() })
  },
  trackMilestoneSubmit(questId: string, milestoneId: string) {
    track("milestone_submit", { questId, milestoneId, timestamp: Date.now() })
  },
  trackRewardClaim(questId: string, amount: string | number) {
    track("reward_claim", { questId, amount, timestamp: Date.now() })
  },
  trackWalletConnect(walletAddress: string) {
    track("wallet_connect", { walletAddress: walletAddress.slice(0, 6), timestamp: Date.now() })
  },
  trackPageNavigation(pageName: string) {
    track("page_navigation", { page: pageName, timestamp: Date.now() })
  },
}
