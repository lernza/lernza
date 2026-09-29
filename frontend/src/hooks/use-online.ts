import { useSyncExternalStore } from "react"

function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

function getOnlineSnapshot(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

function getServerSnapshot(): boolean {
  return true
}

/**
 * Reactive browser connectivity flag — issue #1626.
 *
 * Returns `true` while the browser reports an active connection and
 * re-renders on `online` / `offline` events so the offline banner and
 * transaction-retry logic stay in sync without polling.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, getServerSnapshot)
}

/**
 * Convenience inverse of {@link useOnline} for offline-only UI.
 */
export function useIsOffline(): boolean {
  return !useOnline()
}
