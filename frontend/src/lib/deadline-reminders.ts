/**
 * Deadline reminder selection for #1646 (the "24-hour deadline reminder"
 * notification).
 *
 * The other three notifications the issue asks for ride on contract events, but
 * a deadline crossing into the 24-hour window emits nothing on-chain, so it
 * cannot come from the event stream. It has to be derived locally from quest
 * state. This module holds that derivation as pure functions so the
 * interesting parts — which quests are eligible, and when a viewer has already
 * been told — are unit-testable without a wallet, a clock, or localStorage.
 *
 * ## Deduplication
 *
 * A reminder must fire once per quest per deadline, not once per render or once
 * per poll. Reminders are recorded keyed by the quest's *absolute deadline*
 * rather than by a timestamp, so extending a quest's deadline (which emits
 * `quest_ttl_extended`-style state changes) legitimately re-arms the reminder
 * for the new window, while a re-render, a remount, or a second tab cannot
 * produce a duplicate.
 *
 * Only the quest id and its deadline are persisted. Both are public on-chain
 * values, so the write is compatible with the localStorage prohibitions in
 * `docs/DATA_RETENTION_POLICY.md`, which reserve that storage for secrets and
 * PII rather than banning it outright.
 */

import { isExpiredDeadline, isExpiringSoon } from "./utils"

export const DEADLINE_REMINDER_KEY_PREFIX = "lernza_deadline_reminder:"

const DAY_SECONDS = 24 * 60 * 60

/** Minimal quest shape needed to decide reminder eligibility. */
export interface ReminderCandidate {
  id: number
  name: string
  /** Absolute ledger timestamp, in seconds. `0` means the quest has no deadline. */
  deadline: number
  /**
   * `QuestStatus.Active` is the only status that can still earn a reward. The
   * value is injected rather than imported so this module stays free of the
   * contract-type module; the hook passes the enum member in.
   */
  status: number
  activeStatus: number
}

/** A quest that is due a reminder, with the phrasing for the toast. */
export interface DueReminder {
  questId: number
  questName: string
  /** Human-readable remaining time, e.g. `"3h"` or `"12m"`. */
  timeRemaining: string
  /** The deadline this reminder was recorded against, for deduplication. */
  deadline: number
}

/** Persisted reminders: quest id -> the deadline the viewer was warned about. */
export type SentReminders = Readonly<Record<string, number>>

export const NO_SENT_REMINDERS: SentReminders = {}

/**
 * Format remaining seconds the way the reminder copy expects: hours while
 * there are hours to spare, minutes once the window is tight. Rounds up so a
 * quest with 61 seconds left reads "2m" rather than "1m" and never "0m".
 *
 * The 24-hour boundary reads "24h" rather than "1d": the window this serves is
 * capped at 24 hours, so "1d" would be the least informative phrasing at the one
 * moment it is most likely to be seen.
 */
export function formatTimeRemaining(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "0m"
  if (remainingSeconds <= 60 * 60) {
    return `${Math.max(1, Math.ceil(remainingSeconds / 60))}m`
  }
  const hours = Math.ceil(remainingSeconds / (60 * 60))
  if (hours <= 24) return `${hours}h`
  return `${Math.ceil(remainingSeconds / DAY_SECONDS)}d`
}

/**
 * Whether a quest should produce a reminder right now.
 *
 * Requires all of: a deadline set, the quest still active, the quest not
 * already past its deadline, inside the 24-hour window, and no reminder
 * already recorded against this exact deadline.
 */
export function isReminderDue(
  quest: ReminderCandidate,
  sent: SentReminders,
  nowMs: number = Date.now()
): boolean {
  if (quest.deadline <= 0) return false
  if (quest.status !== quest.activeStatus) return false
  if (isExpiredDeadline(quest.deadline, nowMs)) return false
  if (!isExpiringSoon(quest.deadline, nowMs)) return false

  const recorded = sent[deadlineReminderKey(quest.id)]
  // Compare against the recorded deadline, not truthiness: a quest whose
  // deadline was moved later is due again, and re-notifying is the intent.
  return recorded === undefined || recorded !== quest.deadline
}

export function deadlineReminderKey(questId: number): string {
  return `${DEADLINE_REMINDER_KEY_PREFIX}${questId}`
}

/**
 * Select every due reminder from a set of quests.
 *
 * Ordering is by deadline, soonest first, so that when several of a viewer's
 * quests enter the window together the most urgent one is surfaced at the top.
 */
export function selectDueReminders(
  quests: readonly ReminderCandidate[],
  sent: SentReminders,
  nowMs: number = Date.now()
): DueReminder[] {
  const due: DueReminder[] = []

  for (const quest of quests) {
    if (!isReminderDue(quest, sent, nowMs)) continue

    const nowSeconds = Math.floor(nowMs / 1000)
    const remaining = Math.max(0, quest.deadline - nowSeconds)
    due.push({
      questId: quest.id,
      questName: quest.name,
      timeRemaining: formatTimeRemaining(remaining),
      deadline: quest.deadline,
    })
  }

  return due.sort((a, b) => a.deadline - b.deadline)
}

/**
 * Merge newly-sent reminders into the existing record. Kept separate from the
 * selector so that the caller decides *when* to persist: a reminder should be
 * recorded as sent at the moment it is handed to the notification system, not
 * merely because it was selected, otherwise a reminder blocked by a disabled
 * preference would be lost for the rest of the session.
 */
export function recordReminders(
  sent: SentReminders,
  due: readonly DueReminder[]
): Record<string, number> {
  if (due.length === 0) return { ...sent }

  const next: Record<string, number> = { ...sent }
  for (const reminder of due) {
    next[deadlineReminderKey(reminder.questId)] = reminder.deadline
  }
  return next
}

/**
 * Read persisted reminders, tolerating a missing, empty, or corrupted value.
 *
 * A malformed entry is dropped rather than trusted: a reminder record is
 * reconstructible from the quest list, and a bad value should cost the viewer a
 * possible duplicate reminder rather than a permanently disabled feature.
 */
export function parseSentReminders(raw: string | null): Record<string, number> {
  if (!raw) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {}

  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!key.startsWith(DEADLINE_REMINDER_KEY_PREFIX)) continue
    if (typeof value !== "number" || !Number.isFinite(value)) continue
    result[key] = value
  }
  return result
}
