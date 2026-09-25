/**
 * Offline-first quest-data cache — issue #1626.
 *
 * The service worker (see vite.config.ts) keeps navigations and static assets
 * available offline at the network layer. This module adds the app layer: the
 * most recently fetched public quest list is persisted to localStorage with a
 * 24-hour TTL so the dashboard can render the last known quests while the
 * device is disconnected, then revalidate once connectivity returns.
 */

import { isDev } from "@/lib/env"

export interface CachedQuestSummary {
  id: number
  name: string
  description?: string
  category?: string
  owner?: string
  cachedAt: number
}

const OFFLINE_QUESTS_KEY = "lernza_offline_quests"
const OFFLINE_QUESTS_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface OfflineQuestsEnvelope {
  quests: CachedQuestSummary[]
  savedAt: number
}

function readEnvelope(): OfflineQuestsEnvelope | null {
  try {
    const raw = localStorage.getItem(OFFLINE_QUESTS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OfflineQuestsEnvelope
  } catch {
    if (isDev) console.warn("[offline-cache] failed to read cached quests")
    return null
  }
}

/**
 * Persist the latest quest list for offline viewing. Call after every
 * successful dashboard fetch; failures are swallowed so caching never breaks
 * the online path.
 */
export function saveQuestsForOffline(
  quests: Array<{
    id: number
    name: string
    description?: string
    category?: string
    owner?: string
  }>
): void {
  try {
    const envelope: OfflineQuestsEnvelope = {
      quests: quests.map(q => ({
        id: q.id,
        name: q.name,
        description: q.description,
        category: q.category,
        owner: q.owner,
        cachedAt: Date.now(),
      })),
      savedAt: Date.now(),
    }
    localStorage.setItem(OFFLINE_QUESTS_KEY, JSON.stringify(envelope))
  } catch {
    if (isDev) console.warn("[offline-cache] failed to persist quests for offline viewing")
  }
}

/**
 * Load the last known quest list when the network is unavailable.
 * Returns `null` when no fresh-enough snapshot exists.
 */
export function loadQuestsForOffline(): CachedQuestSummary[] | null {
  const envelope = readEnvelope()
  if (!envelope) return null
  if (Date.now() - envelope.savedAt > OFFLINE_QUESTS_TTL_MS) {
    try {
      localStorage.removeItem(OFFLINE_QUESTS_KEY)
    } catch {
      // Ignore cleanup failures.
    }
    return null
  }
  return envelope.quests
}

/**
 * Whether an offline snapshot is available for disconnected viewing.
 */
export function hasOfflineQuestSnapshot(): boolean {
  return loadQuestsForOffline() !== null
}
