/**
 * Production performance monitoring utility (Issue #1259).
 * Tracks Soroban contract call latencies and frontend rendering performance.
 */
import { track } from "./analytics"
import { logger } from "./logger"

export interface LatencyMetric {
  operation: string
  durationMs: number
  success: boolean
  timestamp: number
}

class PerformanceMonitor {
  private metrics: LatencyMetric[] = []
  private maxStoredMetrics = 100

  /**
   * Measure execution time of a contract call or asynchronous operation.
   */
  async measureContractCall<T>(
    operationName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now()
    let success = true

    try {
      const result = await fn()
      return result
    } catch (err) {
      success = false
      throw err
    } finally {
      const durationMs = Math.round(performance.now() - startTime)
      this.recordMetric(operationName, durationMs, success)
    }
  }

  /**
   * Record a performance metric and send analytics event.
   */
  private recordMetric(operation: string, durationMs: number, success: boolean): void {
    const metric: LatencyMetric = {
      operation,
      durationMs,
      success,
      timestamp: Date.now(),
    }

    this.metrics.push(metric)
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics.shift()
    }

    logger.info(`[PerfMonitor] ${operation}: ${durationMs}ms (success: ${success})`)

    track("contract_call_latency", {
      operation,
      durationMs,
      success,
    })
  }

  /**
   * Get historical performance metrics.
   */
  getMetrics(): LatencyMetric[] {
    return [...this.metrics]
  }

  /**
   * Calculate average latency for a specific operation.
   */
  getAverageLatency(operationName?: string): number {
    const filtered = operationName
      ? this.metrics.filter((m) => m.operation === operationName)
      : this.metrics

    if (filtered.length === 0) return 0
    const sum = filtered.reduce((acc, curr) => acc + curr.durationMs, 0)
    return Math.round(sum / filtered.length)
  }
}

export const performanceMonitor = new PerformanceMonitor()
