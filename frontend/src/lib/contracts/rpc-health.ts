import * as rpc from "@stellar/stellar-sdk/rpc"

export interface RpcHealthConfig {
  urls: string[]
  timeoutMs?: number
  maxConsecutiveFailures?: number
  healthCheckIntervalMs?: number
}

interface RpcEndpoint {
  url: string
  healthy: boolean
  consecutiveFailures: number
  lastCheckedMs: number
}

export class RpcHealthManager {
  private endpoints: RpcEndpoint[]
  private currentIndex: number = 0
  private healthCheckIntervalMs: number
  private maxConsecutiveFailures: number
  private timeoutMs: number
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor(config: RpcHealthConfig) {
    this.endpoints = config.urls.map(url => ({
      url,
      healthy: true,
      consecutiveFailures: 0,
      lastCheckedMs: 0,
    }))
    this.timeoutMs = config.timeoutMs || 5000
    this.maxConsecutiveFailures = config.maxConsecutiveFailures || 3
    this.healthCheckIntervalMs = config.healthCheckIntervalMs || 30000
  }

  /**
   * Get the current healthy RPC endpoint. Falls back to next endpoint if current is unhealthy.
   */
  getHealthyEndpoint(): string {
    const healthyEndpoint = this.findHealthyEndpoint()
    if (healthyEndpoint) {
      return healthyEndpoint.url
    }
    // All endpoints are unhealthy - return the one with least failures
    return this.endpoints.reduce((prev, current) =>
      prev.consecutiveFailures <= current.consecutiveFailures ? prev : current
    ).url
  }

  /**
   * Create a Soroban RPC server using the current healthy endpoint
   */
  getServer(): rpc.Server {
    return new rpc.Server(this.getHealthyEndpoint())
  }

  /**
   * Mark an endpoint as failed and attempt failover
   */
  markFailed(url: string): void {
    const endpoint = this.endpoints.find(e => e.url === url)
    if (!endpoint) return

    endpoint.consecutiveFailures++
    endpoint.healthy = endpoint.consecutiveFailures < this.maxConsecutiveFailures

    // Try to find a healthy endpoint
    const healthyEndpoint = this.findHealthyEndpoint()
    if (!healthyEndpoint && endpoint.url === this.getHealthyEndpoint()) {
      // Current endpoint failed and no healthy ones available, try next
      this.rotateEndpoint()
    }
  }

  /**
   * Mark an endpoint as recovered
   */
  markRecovered(url: string): void {
    const endpoint = this.endpoints.find(e => e.url === url)
    if (!endpoint) return

    endpoint.consecutiveFailures = 0
    endpoint.healthy = true
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.healthCheckIntervalMs)

    // Perform initial check immediately
    this.performHealthChecks()
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * Check health of all endpoints
   */
  private async performHealthChecks(): Promise<void> {
    const checks = this.endpoints.map(endpoint =>
      this.checkEndpointHealth(endpoint)
    )

    await Promise.allSettled(checks)
  }

  /**
   * Check if a single endpoint is healthy
   */
  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<void> {
    try {
      const server = new rpc.Server(endpoint.url)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

      try {
        // Use getHealth as a lightweight health check
        await Promise.race([
          (server as any).getHealth?.() || Promise.resolve(),
          new Promise((_, reject) =>
            controller.signal.addEventListener('abort', () => {
              reject(new Error('Health check timeout'))
            })
          ),
        ])

        endpoint.consecutiveFailures = 0
        endpoint.healthy = true
        endpoint.lastCheckedMs = Date.now()
      } finally {
        clearTimeout(timeoutId)
      }
    } catch {
      endpoint.consecutiveFailures++
      endpoint.healthy = endpoint.consecutiveFailures < this.maxConsecutiveFailures
      endpoint.lastCheckedMs = Date.now()
    }
  }

  /**
   * Find a healthy endpoint, rotating if needed
   */
  private findHealthyEndpoint(): RpcEndpoint | undefined {
    // First, check if current endpoint is still healthy
    const current = this.endpoints[this.currentIndex]
    if (current?.healthy) {
      return current
    }

    // Find any healthy endpoint
    const healthy = this.endpoints.find(e => e.healthy)
    if (healthy) {
      this.currentIndex = this.endpoints.indexOf(healthy)
      return healthy
    }

    return undefined
  }

  /**
   * Rotate to next endpoint
   */
  private rotateEndpoint(): void {
    this.currentIndex = (this.currentIndex + 1) % this.endpoints.length
  }

  /**
   * Get health status of all endpoints
   */
  getStatus(): Array<{ url: string; healthy: boolean; consecutiveFailures: number }> {
    return this.endpoints.map(e => ({
      url: e.url,
      healthy: e.healthy,
      consecutiveFailures: e.consecutiveFailures,
    }))
  }
}

/**
 * Parse RPC URLs from environment variable (JSON array or comma-separated)
 */
export function parseRpcUrls(rpcUrlEnv: string | undefined): string[] {
  if (!rpcUrlEnv) return []

  // Try JSON array first
  try {
    const parsed = JSON.parse(rpcUrlEnv)
    if (Array.isArray(parsed) && parsed.every(url => typeof url === 'string')) {
      return parsed
    }
  } catch {
    // Not JSON, try comma-separated
  }

  // Comma-separated fallback
  return rpcUrlEnv
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0)
}
