/**
 * Owns the lifetime of the Soroban RPC health-check interval.
 *
 * `lib/contracts/client.ts` used to call `rpcHealthManager.startHealthChecks()`
 * at module load, which meant importing the module anywhere — a test, a lazy
 * page chunk, a second bundle — started a 30s `setInterval` that nothing owned.
 * Nothing ever called `stopHealthChecks()`, so the timer outlived the component
 * that wanted it, kept a fresh `rpc.Server` per tick alive, and stacked up on
 * every hot-module reload. Mounting this hook in the app root ties the interval
 * to a component that can clean it up.
 */
import { useEffect } from "react"
import { startRpcHealthChecks, stopRpcHealthChecks } from "@/lib/contracts/client"

export interface RpcHealthOptions {
  /**
   * Set false to leave the interval alone entirely (e.g. a subtree that must
   * not keep the app polling). Defaults to true.
   */
  enabled?: boolean
}

/**
 * Starts RPC health checks while mounted and stops them on unmount.
 *
 * Consumers are reference-counted inside `client.ts`, so mounting this in more
 * than one place still runs exactly one interval, and it is torn down only when
 * the last consumer unmounts. Under Vitest both start and stop are no-ops, so
 * tests never see a dangling timer.
 */
export function useRpcHealth({ enabled = true }: RpcHealthOptions = {}): void {
  useEffect(() => {
    if (!enabled) return

    startRpcHealthChecks()
    return () => stopRpcHealthChecks()
  }, [enabled])
}
