import { useEffect, useState } from "react"

/** Default refresh cadence for deadline countdowns (30s). */
const DEFAULT_TICK_MS = 30_000

/**
 * Wall-clock `Date.now()` that keeps itself current — issue #1335.
 *
 * Countdowns used to capture the clock once (at module load or on first
 * render) and reuse that value forever, so a page kept open — or a tab
 * restored from the background — counted down from a timestamp captured
 * minutes or hours earlier and kept advertising time that had already passed.
 *
 * This hook re-reads the clock on an interval and, because browsers throttle
 * timers in background tabs, re-syncs immediately when the tab becomes
 * visible or regains focus so deadlines are correct the moment the user
 * returns to the app.
 */
export function useNow(tickMs: number = DEFAULT_TICK_MS): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const sync = () => setNow(Date.now())

    const interval = setInterval(sync, tickMs)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sync()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", sync)
    window.addEventListener("pageshow", sync)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", sync)
      window.removeEventListener("pageshow", sync)
    }
  }, [tickMs])

  return now
}

/**
 * {@link useNow} expressed in whole unix seconds, which is the unit quest and
 * milestone deadlines are stored in on-chain.
 */
export function useNowSeconds(tickMs: number = DEFAULT_TICK_MS): number {
  return Math.floor(useNow(tickMs) / 1000)
}
