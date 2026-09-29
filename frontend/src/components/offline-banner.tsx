import { WifiOff, Wifi, Clock } from "lucide-react"
import { useOnline } from "@/hooks/use-online"
import { getQueuedOfflineTransactions } from "@/lib/offline-transaction-queue"
import { hasOfflineQuestSnapshot } from "@/lib/offline-quest-cache"
import { useState, useEffect } from "react"

/**
 * Offline status banner — issue #1626.
 *
 * Fixed beneath the navbar while `navigator.onLine === false`, telling the
 * user that quest data is served from cache and that transaction attempts
 * will be queued for retry when the connection returns. Announces via
 * `role="status"` so screen readers pick up connectivity changes.
 */
export function OfflineBanner() {
  const online = useOnline()
  const [queuedCount, setQueuedCount] = useState(0)
  const [hasCachedQuests, setHasCachedQuests] = useState(false)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    if (!online) {
      setQueuedCount(getQueuedOfflineTransactions().length)
      setHasCachedQuests(hasOfflineQuestSnapshot())
      setJustReconnected(false)
      return
    }
    // Show a brief "back online" confirmation, then hide.
    setJustReconnected(true)
    const timer = setTimeout(() => setJustReconnected(false), 5000)
    return () => clearTimeout(timer)
  }, [online])

  // Refresh the queued count whenever connectivity flips.
  useEffect(() => {
    const refresh = () => setQueuedCount(getQueuedOfflineTransactions().length)
    window.addEventListener("online", refresh)
    window.addEventListener("offline", refresh)
    return () => {
      window.removeEventListener("online", refresh)
      window.removeEventListener("offline", refresh)
    }
  }, [])

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-border bg-accent text-accent-foreground border-b px-4 py-2.5"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 text-center text-sm font-medium">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            You&apos;re offline — {hasCachedQuests ? "showing cached quests. " : "quest data may be unavailable. "}
            Transaction attempts will be queued and retried when you reconnect.
          </span>
          {queuedCount > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {queuedCount} queued
            </span>
          )}
        </div>
      </div>
    )
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-border bg-success/10 text-foreground border-b px-4 py-2"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-sm font-medium">
          <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Back online — refreshing quest data and retrying queued transactions.</span>
        </div>
      </div>
    )
  }

  return null
}
