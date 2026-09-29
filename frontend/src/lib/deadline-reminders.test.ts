import { describe, it, expect } from "vitest"
import {
  DEADLINE_REMINDER_KEY_PREFIX,
  deadlineReminderKey,
  formatTimeRemaining,
  isReminderDue,
  parseSentReminders,
  recordReminders,
  selectDueReminders,
  type ReminderCandidate,
} from "./deadline-reminders"

const ACTIVE = 1
const CANCELLED = 3

const NOW_SECONDS = 1_700_000_000
const NOW_MS = NOW_SECONDS * 1000

function quest(overrides: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    id: 1,
    name: "Rust Fundamentals",
    deadline: NOW_SECONDS + 3 * 60 * 60, // three hours out
    status: ACTIVE,
    activeStatus: ACTIVE,
    ...overrides,
  }
}

describe("formatTimeRemaining", () => {
  it("formats minutes below an hour, rounding up so it never reads 0m", () => {
    expect(formatTimeRemaining(61)).toBe("2m")
    expect(formatTimeRemaining(60 * 60)).toBe("60m")
  })

  it("formats hours within the reminder window", () => {
    expect(formatTimeRemaining(60 * 60 * 3)).toBe("3h")
    expect(formatTimeRemaining(24 * 60 * 60)).toBe("24h")
  })

  it("clamps a zero or negative remainder", () => {
    expect(formatTimeRemaining(0)).toBe("0m")
    expect(formatTimeRemaining(-10)).toBe("0m")
  })
})

describe("isReminderDue", () => {
  it("is due for an active quest inside the 24-hour window", () => {
    expect(isReminderDue(quest(), {}, NOW_MS)).toBe(true)
  })

  it("is due at exactly 24 hours out", () => {
    expect(isReminderDue(quest({ deadline: NOW_SECONDS + 24 * 60 * 60 }), {}, NOW_MS)).toBe(true)
  })

  it("is not due beyond the 24-hour window", () => {
    expect(isReminderDue(quest({ deadline: NOW_SECONDS + 24 * 60 * 60 + 1 }), {}, NOW_MS)).toBe(
      false
    )
  })

  it("is not due for a quest with no deadline", () => {
    expect(isReminderDue(quest({ deadline: 0 }), {}, NOW_MS)).toBe(false)
  })

  it("is not due once the deadline has passed", () => {
    expect(isReminderDue(quest({ deadline: NOW_SECONDS - 1 }), {}, NOW_MS)).toBe(false)
  })

  it("is not due for a cancelled or archived quest", () => {
    expect(isReminderDue(quest({ status: CANCELLED }), {}, NOW_MS)).toBe(false)
  })

  it("is not due when already reminded against this deadline", () => {
    const sent = { [deadlineReminderKey(1)]: NOW_SECONDS + 3 * 60 * 60 }
    expect(isReminderDue(quest(), sent, NOW_MS)).toBe(false)
  })

  it("becomes due again when the deadline is extended", () => {
    // Deduping on the recorded deadline rather than a timestamp means a quest
    // given more time re-arms its reminder for the new window.
    const sent = { [deadlineReminderKey(1)]: NOW_SECONDS + 60 * 60 }
    expect(isReminderDue(quest({ deadline: NOW_SECONDS + 3 * 60 * 60 }), sent, NOW_MS)).toBe(true)
  })
})

describe("selectDueReminders", () => {
  it("orders by soonest deadline first", () => {
    const due = selectDueReminders(
      [
        quest({ id: 1, deadline: NOW_SECONDS + 3 * 60 * 60 }),
        quest({ id: 2, deadline: NOW_SECONDS + 30 * 60 }),
        quest({ id: 3, deadline: NOW_SECONDS + 10 * 60 * 60 }),
      ],
      {},
      NOW_MS
    )
    expect(due.map(r => r.questId)).toEqual([2, 1, 3])
  })

  it("carries the name and a formatted remainder for the toast", () => {
    const [reminder] = selectDueReminders([quest()], {}, NOW_MS)
    expect(reminder).toMatchObject({
      questId: 1,
      questName: "Rust Fundamentals",
      timeRemaining: "3h",
      deadline: NOW_SECONDS + 3 * 60 * 60,
    })
  })

  it("returns nothing when every candidate is out of window", () => {
    const due = selectDueReminders(
      [
        quest({ id: 1, deadline: NOW_SECONDS + 48 * 60 * 60 }),
        quest({ id: 2, deadline: NOW_SECONDS + 7 * 24 * 60 * 60 }),
      ],
      {},
      NOW_MS
    )
    expect(due).toEqual([])
  })
})

describe("recordReminders", () => {
  it("records each due reminder against its deadline", () => {
    const due = selectDueReminders([quest({ id: 1 }), quest({ id: 2 })], {}, NOW_MS)
    const sent = recordReminders({}, due)
    expect(sent).toEqual({
      [deadlineReminderKey(1)]: quest({ id: 1 }).deadline,
      [deadlineReminderKey(2)]: quest({ id: 2 }).deadline,
    })
  })

  it("preserves existing records and does not mutate the input", () => {
    const existing = { [deadlineReminderKey(9)]: 123 }
    const next = recordReminders(existing, [
      { questId: 1, questName: "A", timeRemaining: "2h", deadline: 456 },
    ])
    expect(next[deadlineReminderKey(9)]).toBe(123)
    expect(next[deadlineReminderKey(1)]).toBe(456)
    expect(existing).toEqual({ [deadlineReminderKey(9)]: 123 })
  })

  it("is a no-op when nothing is due", () => {
    const existing = { [deadlineReminderKey(9)]: 123 }
    expect(recordReminders(existing, [])).toEqual(existing)
  })

  it("makes a second selection empty", () => {
    const due = selectDueReminders([quest()], {}, NOW_MS)
    const sent = recordReminders({}, due)
    expect(selectDueReminders([quest()], sent, NOW_MS)).toEqual([])
  })
})

describe("parseSentReminders", () => {
  it("round-trips a record", () => {
    const raw = JSON.stringify({ [deadlineReminderKey(1)]: 456 })
    expect(parseSentReminders(raw)).toEqual({ [deadlineReminderKey(1)]: 456 })
  })

  it("returns empty for missing, empty, or malformed values", () => {
    expect(parseSentReminders(null)).toEqual({})
    expect(parseSentReminders("")).toEqual({})
    expect(parseSentReminders("{not json")).toEqual({})
    expect(parseSentReminders("[1,2,3]")).toEqual({})
    expect(parseSentReminders("null")).toEqual({})
  })

  it("drops entries that are not numbers or not reminder keys", () => {
    const raw = JSON.stringify({
      [deadlineReminderKey(1)]: 456,
      [deadlineReminderKey(2)]: "not a number",
      [deadlineReminderKey(3)]: null,
      unrelated_key: 789,
    })
    expect(parseSentReminders(raw)).toEqual({ [deadlineReminderKey(1)]: 456 })
  })

  it("rejects non-finite numbers", () => {
    const raw = `{"${DEADLINE_REMINDER_KEY_PREFIX}1": null}`
    expect(parseSentReminders(raw)).toEqual({})
  })
})
