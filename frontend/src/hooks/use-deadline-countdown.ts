/**
 * Hook for a live, resync-safe deadline countdown.
 *
 * The countdown ticks every second.  When the page returns from background /
 * suspension (visibilitychange → visible) the reference time is immediately
 * refreshed from Date.now() so the displayed value is always accurate, even
 * after the browser throttled or paused the interval.
 */

import { useEffect, useState } from "react"
import { getSecondsRemaining } from "@/lib/utils"

/**
 * Returns the number of whole seconds remaining until `deadline` (a Unix
 * timestamp in seconds).  The value updates every second and is re-synced
 * against the real wall clock whenever the page becomes visible again.
 *
 * Returns `null` when `deadline` is 0 / falsy (no deadline).
 * Returns 0 once the deadline has passed.
 */
export function useDeadlineCountdown(deadline: number | undefined): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => {
    if (!deadline) return null
    return getSecondsRemaining(deadline)
  })

  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(null)
      return
    }

    // Immediately set an accurate value in case the component mounts after
    // a period of inactivity.
    const refresh = () => setSecondsLeft(getSecondsRemaining(deadline))

    refresh()

    const interval = setInterval(refresh, 1000)

    // Re-sync as soon as the tab becomes visible again so the countdown is
    // never stale after the browser paused / throttled the interval.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh()
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [deadline])

  return secondsLeft
}
