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
