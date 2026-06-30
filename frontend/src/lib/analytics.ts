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
