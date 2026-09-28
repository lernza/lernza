import { useEffect, useMemo, useRef } from "react"
import { useNotifications } from "@/contexts/notification-context"
import { useUserRole } from "@/hooks/use-user-role"
import { useWallet } from "@/hooks/use-wallet"
import { QuestStatus } from "@/lib/contract-types"
import {
  parseSentReminders,
  recordReminders,
  selectDueReminders,
  type DueReminder,
  type ReminderCandidate,
  type SentReminders,
} from "@/lib/deadline-reminders"

/**
 * 24-hour deadline reminders for #1646.
 *
 * Unlike the other three notifications the issue asks for, a deadline entering
 * its final day emits no contract event, so there is nothing to poll for. The
 * reminder is instead derived from the quest state the viewer already loads,
 * which keeps it entirely client-side — no new indexer, no service, no
 * scheduled job.
 *
 * The selection and deduplication rules live in `@/lib/deadline-reminders` as
 * pure functions; this hook only supplies quest state, the clock, and
 * persistence.
 */

/** How often to re-evaluate the window. */
const CHECK_INTERVAL_MS = 60_000

const STORAGE_KEY = "lernza_deadline_reminders"

/**
 * Read the sent-reminder record from localStorage.
 *
 * Only quest ids and their deadlines are persisted — both public on-chain
 * values, so this does not conflict with the localStorage prohibitions in
 * `docs/DATA_RETENTION_POLICY.md`. Storage access is wrapped because this hook
 * runs during client render cycles where `localStorage` can throw (Safari
 * private mode, disabled cookies) and a failed read must degrade to "notify
 * again" rather than crash the app.
 */
function readSentReminders(): Record<string, number> {
  try {
    return parseSentReminders(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return {}
  }
}

function writeSentReminders(next: Record<string, number>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is an optimisation for suppressing duplicates, not a
    // correctness requirement; a failure only costs a repeat reminder.
  }
}

export function useDeadlineReminders(enabled = true): void {
  const { notifyDeadlineReminder } = useNotifications()
  const { address } = useWallet()
  const { ownedQuests, enrolledQuests, isLoading } = useUserRole()

  // Reminders already delivered, kept in a ref as well as localStorage so that
  // the check interval does not re-read storage on every tick and so that a
  // notification is recorded as sent within the same tick it was emitted.
  const sentRef = useRef<SentReminders>({})

  // A quest the viewer both created and enrolled in should be reminded once,
  // not twice.
  const candidates = useMemo<ReminderCandidate[]>(() => {
    const byId = new Map<number, ReminderCandidate>()

    const add = (quest: (typeof ownedQuests)[number]) => {
      byId.set(quest.id, {
        id: quest.id,
        name: quest.name,
        deadline: quest.deadline,
        status: quest.status,
        activeStatus: QuestStatus.Active,
      })
    }

    for (const quest of ownedQuests) add(quest)
    for (const quest of enrolledQuests) add(quest)

    return [...byId.values()]
  }, [ownedQuests, enrolledQuests])

  useEffect(() => {
    if (!enabled || !address || isLoading) return

    // Reload from storage when the viewer changes: another account on the same
    // browser has a different set of quests and its own sent reminders.
    sentRef.current = readSentReminders()

    let cancelled = false

    const check = () => {
      if (cancelled) return

      const due: DueReminder[] = selectDueReminders(candidates, sentRef.current)

      if (due.length === 0) return

      // Record before notifying. `addToast` returns "" when the deadline
      // preference is off, in which case the viewer never saw the reminder —
      // but recording it first keeps a single check from emitting the same
      // reminder repeatedly while the preference is disabled, and re-enabling
      // mid-window is not worth a storm of retro toasts.
      sentRef.current = recordReminders(sentRef.current, due)
      writeSentReminders(sentRef.current)

      for (const reminder of due) {
        notifyDeadlineReminder(reminder.questName, reminder.timeRemaining)
      }
    }

    check()
    const interval = window.setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [enabled, address, isLoading, candidates, notifyDeadlineReminder])
}
