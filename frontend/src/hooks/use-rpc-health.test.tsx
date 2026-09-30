import { afterEach, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { useRpcHealth } from "./use-rpc-health"
import {
  areRpcHealthChecksRunning,
  rpcHealthManager,
  startRpcHealthChecks,
  stopRpcHealthChecks,
} from "@/lib/contracts/client"

/**
 * `useRpcHealth` exists because importing `client.ts` used to call
 * `rpcHealthManager.startHealthChecks()` at module load — a 30s interval no
 * code ever cleared. These tests pin the replacement contract: nothing starts
 * on import, consumers are reference-counted, and unmount always releases.
 *
 * Vitest reports MODE as "test", so `rpcHealthManager` is built with
 * `allowTimers: false` and never really schedules anything here — asserted
 * explicitly below. The reference counting is therefore observed through
 * `areRpcHealthChecksRunning()` rather than through a spy on the manager's
 * `stopHealthChecks`, which `startHealthChecks` also calls on its own pre-clear
 * path and would make the stop count ambiguous.
 */
function releaseAllConsumers() {
  while (areRpcHealthChecksRunning()) stopRpcHealthChecks()
}

function Harness({ enabled }: { enabled?: boolean }) {
  useRpcHealth(enabled === undefined ? undefined : { enabled })
  return null
}

describe("rpc health checks on module import", () => {
  it("does not start an interval just because client.ts was imported", () => {
    expect(areRpcHealthChecksRunning()).toBe(false)
    expect(rpcHealthManager.isHealthChecking()).toBe(false)
  })
})

describe("useRpcHealth", () => {
  afterEach(() => {
    releaseAllConsumers()
    vi.restoreAllMocks()
  })

  it("starts on mount and stops on unmount", () => {
    const startSpy = vi.spyOn(rpcHealthManager, "startHealthChecks")

    const { unmount } = render(<Harness />)

    expect(startSpy).toHaveBeenCalledTimes(1)
    expect(areRpcHealthChecksRunning()).toBe(true)

    unmount()
    expect(areRpcHealthChecksRunning()).toBe(false)
    expect(rpcHealthManager.isHealthChecking()).toBe(false)
  })

  it("does not register a consumer when disabled", () => {
    const startSpy = vi.spyOn(rpcHealthManager, "startHealthChecks")

    const { unmount } = render(<Harness enabled={false} />)

    expect(startSpy).not.toHaveBeenCalled()
    expect(areRpcHealthChecksRunning()).toBe(false)

    unmount()
    expect(areRpcHealthChecksRunning()).toBe(false)
  })

  it("reference-counts consumers: two mounts share one interval", () => {
    const startSpy = vi.spyOn(rpcHealthManager, "startHealthChecks")

    const first = render(<Harness />)
    const second = render(<Harness />)

    // The second mount joins the consumer set rather than adding a timer.
    expect(startSpy).toHaveBeenCalledTimes(1)
    expect(areRpcHealthChecksRunning()).toBe(true)

    // A nested subtree unmounting must not tear down the app root's checks.
    second.unmount()
    expect(areRpcHealthChecksRunning()).toBe(true)

    first.unmount()
    expect(areRpcHealthChecksRunning()).toBe(false)
    expect(rpcHealthManager.isHealthChecking()).toBe(false)
  })

  it("survives repeated remounts without leaking consumers", () => {
    const startSpy = vi.spyOn(rpcHealthManager, "startHealthChecks")

    for (let i = 0; i < 3; i++) {
      const { unmount } = render(<Harness />)
      expect(areRpcHealthChecksRunning(), `cycle ${i} mounted`).toBe(true)
      unmount()
      expect(areRpcHealthChecksRunning(), `cycle ${i} unmounted`).toBe(false)
    }

    expect(startSpy).toHaveBeenCalledTimes(3)
    expect(rpcHealthManager.isHealthChecking()).toBe(false)
  })

  it("schedules no real interval under the test runner", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval")

    const { unmount } = render(<Harness />)
    expect(setIntervalSpy).not.toHaveBeenCalled()
    unmount()
  })
})

describe("startRpcHealthChecks / stopRpcHealthChecks", () => {
  afterEach(() => {
    releaseAllConsumers()
    vi.restoreAllMocks()
  })

  it("tolerates a stop with no matching start", () => {
    expect(() => stopRpcHealthChecks()).not.toThrow()
    expect(areRpcHealthChecksRunning()).toBe(false)
  })

  it("never drives the consumer count below zero", () => {
    startRpcHealthChecks()
    stopRpcHealthChecks()
    stopRpcHealthChecks()

    expect(areRpcHealthChecksRunning()).toBe(false)

    // Still able to start afterwards — the counter did not go negative, which
    // would otherwise skip the `=== 1` branch and leave no interval running.
    const startSpy = vi.spyOn(rpcHealthManager, "startHealthChecks")
    startRpcHealthChecks()

    expect(startSpy).toHaveBeenCalledTimes(1)
    expect(areRpcHealthChecksRunning()).toBe(true)
  })
})
