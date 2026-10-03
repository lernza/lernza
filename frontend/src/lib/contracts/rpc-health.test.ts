import { afterEach, describe, expect, it, vi } from "vitest"
import { RpcHealthManager, parseRpcUrls } from "./rpc-health"

// The manager builds an `rpc.Server` and calls `getHealth()` on start. Stub the
// SDK so these tests exercise the timer lifecycle without touching the network.
vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: class {
    constructor(public url: string) {}
    async getHealth() {
      return { status: "healthy", url: this.url }
    }
  },
}))

const URL_A = "https://rpc-a.example/soroban/rpc"
const URL_B = "https://rpc-b.example/soroban/rpc"

describe("RpcHealthManager health-check interval", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("creates no interval when allowTimers is false", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval")
    const manager = new RpcHealthManager({ urls: [URL_A], allowTimers: false })

    manager.startHealthChecks()

    expect(setIntervalSpy).not.toHaveBeenCalled()
    expect(manager.isHealthChecking()).toBe(false)
  })

  it("schedules and clears an interval when timers are allowed", () => {
    vi.useFakeTimers()
    const manager = new RpcHealthManager({ urls: [URL_A], healthCheckIntervalMs: 1000 })

    manager.startHealthChecks()
    expect(manager.isHealthChecking()).toBe(true)

    manager.stopHealthChecks()
    expect(manager.isHealthChecking()).toBe(false)
  })

  it("does not stack intervals when started twice", () => {
    vi.useFakeTimers()
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval")
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval")
    const manager = new RpcHealthManager({ urls: [URL_A], healthCheckIntervalMs: 1000 })

    manager.startHealthChecks()
    manager.startHealthChecks()

    // The second start replaced the first rather than adding a second timer.
    expect(setIntervalSpy).toHaveBeenCalledTimes(2)
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    expect(manager.isHealthChecking()).toBe(true)

    manager.stopHealthChecks()
  })

  it("is safe to stop when never started", () => {
    const manager = new RpcHealthManager({ urls: [URL_A] })
    expect(() => manager.stopHealthChecks()).not.toThrow()
    expect(manager.isHealthChecking()).toBe(false)
  })
})

describe("RpcHealthManager endpoint selection", () => {
  it("prefers the first healthy endpoint", () => {
    const manager = new RpcHealthManager({ urls: [URL_A, URL_B] })
    expect(manager.getHealthyEndpoint()).toBe(URL_A)
    expect(manager.getStatus().every(e => e.healthy)).toBe(true)
  })

  it("fails over to the next endpoint once failures cross the threshold", () => {
    const manager = new RpcHealthManager({
      urls: [URL_A, URL_B],
      maxConsecutiveFailures: 2,
    })

    manager.markFailed(URL_A)
    expect(manager.getHealthyEndpoint()).toBe(URL_A) // still below the threshold

    manager.markFailed(URL_A)
    expect(manager.getHealthyEndpoint()).toBe(URL_B)
  })

  it("clears the failure count on recovery", () => {
    const manager = new RpcHealthManager({ urls: [URL_A, URL_B], maxConsecutiveFailures: 2 })

    manager.markFailed(URL_A)
    manager.markFailed(URL_A)
    manager.markRecovered(URL_A)

    const status = manager.getStatus().find(e => e.url === URL_A)
    expect(status).toMatchObject({ healthy: true, consecutiveFailures: 0 })
  })

  it("ignores failures reported for an unknown endpoint", () => {
    const manager = new RpcHealthManager({ urls: [URL_A] })

    manager.markFailed("https://unknown.example")
    manager.markRecovered("https://unknown.example")

    const status = manager.getStatus()
    expect(status).toHaveLength(1)
    expect(status[0].consecutiveFailures).toBe(0)
  })

  it("still returns an endpoint when every endpoint is unhealthy", () => {
    const manager = new RpcHealthManager({ urls: [URL_A, URL_B], maxConsecutiveFailures: 1 })

    manager.markFailed(URL_A)
    manager.markFailed(URL_B)

    expect(manager.getHealthyEndpoint()).toBeTruthy()
  })

  it("builds a server from the current healthy endpoint", () => {
    const manager = new RpcHealthManager({ urls: [URL_A, URL_B], maxConsecutiveFailures: 1 })
    manager.markFailed(URL_A)

    const server = manager.getServer() as unknown as { url: string }
    expect(server.url).toBe(URL_B)
  })
})

describe("parseRpcUrls", () => {
  it("returns an empty list for an unset variable", () => {
    expect(parseRpcUrls(undefined)).toEqual([])
  })

  it("parses a JSON array of URLs", () => {
    expect(parseRpcUrls(JSON.stringify([URL_A, URL_B]))).toEqual([URL_A, URL_B])
  })

  it("falls back to comma-separated values", () => {
    expect(parseRpcUrls(`${URL_A}, ${URL_B}`)).toEqual([URL_A, URL_B])
  })

  it("rejects a JSON array containing non-strings", () => {
    // Falls through to comma-splitting rather than handing the caller a number
    // as an endpoint URL.
    expect(parseRpcUrls("[1, 2]")).toEqual(["[1", "2]"])
  })

  it("drops empty segments", () => {
    expect(parseRpcUrls(`${URL_A},,${URL_B}`)).toEqual([URL_A, URL_B])
  })
})
