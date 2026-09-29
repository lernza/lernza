/**
 * Export helpers for the creator analytics page (issue #1648).
 *
 * Kept separate from the page so the formatting rules stay unit-testable:
 * quest names are user-controlled strings coming off-chain, so the CSV writer
 * has to escape separators *and* neutralise spreadsheet formula injection.
 *
 * PDF export deliberately goes through the browser print pipeline rather than
 * a bundled PDF library — see `exportPdf` below.
 */

/** The per-quest shape the analytics page exports. Mirrors `QuestAnalytics`. */
export interface ExportableQuest {
  id: number
  name: string
  createdAt: number
  enrollees: number
  milestones: number
  completedMilestones: number
  poolBalance: bigint
}

/** Inclusive `YYYY-MM-DD` bounds. Empty string means "unbounded on that side". */
export interface DateRange {
  from: string
  to: string
}

const DAY_SECONDS = 86_400

/** `YYYY-MM-DD` → unix seconds at UTC midnight. `null` when unparseable. */
function startOfDayUtc(date: string): number | null {
  if (!date) return null
  const parsed = Date.parse(`${date}T00:00:00Z`)
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
}

/**
 * Keeps the quests whose `createdAt` falls inside the range.
 *
 * An empty bound is open-ended, and `to` is inclusive of the whole day so
 * picking the same start and end date still returns that day's quests.
 */
export function filterByCreatedAt<T extends { createdAt: number }>(
  items: T[],
  range: DateRange
): T[] {
  const from = startOfDayUtc(range.from)
  // Inclusive end: step to the start of the following day.
  const toStart = startOfDayUtc(range.to)
  const to = toStart === null ? null : toStart + DAY_SECONDS - 1

  return items.filter(item => {
    if (from !== null && item.createdAt < from) return false
    if (to !== null && item.createdAt > to) return false
    return true
  })
}

/** `YYYY-MM-DD` for a unix-seconds timestamp, in UTC. */
export function toIsoDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10)
}

/** Completion rate for a quest, or `null` when it has no possible milestones. */
export function completionRate(quest: ExportableQuest): number | null {
  const possible = quest.milestones * quest.enrollees
  if (possible <= 0) return null
  return quest.completedMilestones / possible
}

/**
 * Escapes one CSV field.
 *
 * Wraps in quotes when the value contains a separator, quote or newline, and
 * doubles inner quotes per RFC 4180. A leading `=`, `+`, `-` or `@` is
 * prefixed with an apostrophe so spreadsheet apps treat it as text instead of
 * evaluating it as a formula — quest names are attacker-controllable.
 */
export function escapeCsvField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

function toCsvRow(fields: Array<string | number | null>): string {
  return fields.map(field => escapeCsvField(field === null ? "" : String(field))).join(",")
}

/** One bucket of the enrollment-over-time series. */
export interface EnrollmentBucket {
  /** `YYYY-MM` month the quests in this bucket were created. */
  month: string
  quests: number
  /** Enrollees summed across the quests created in this month. */
  enrollees: number
  /** Running total of `enrollees` up to and including this month. */
  cumulativeEnrollees: number
}

/**
 * Buckets quests by the month they were *created* and accumulates enrollees.
 *
 * The contract stores no per-enrollment timestamp (`getEnrollees` returns bare
 * addresses), so a true enrollment time series is not derivable from ledger
 * state. This is therefore a creation-cohort series, and the CSV labels it as
 * such rather than implying otherwise.
 */
export function buildEnrollmentSeries(quests: ExportableQuest[]): EnrollmentBucket[] {
  const byMonth = new Map<string, { quests: number; enrollees: number }>()

  for (const quest of quests) {
    const month = toIsoDate(quest.createdAt).slice(0, 7)
    const bucket = byMonth.get(month) ?? { quests: 0, enrollees: 0 }
    bucket.quests += 1
    bucket.enrollees += quest.enrollees
    byMonth.set(month, bucket)
  }

  let cumulative = 0
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, bucket]) => {
      cumulative += bucket.enrollees
      return { month, ...bucket, cumulativeEnrollees: cumulative }
    })
}

/** Totals shown in the CSV header and the printed report. */
export interface ExportSummary {
  questCount: number
  totalEnrollees: number
  totalMilestones: number
  totalCompletedMilestones: number
  totalPoolBalance: bigint
  /** `null` when no quest in the range has a possible milestone. */
  overallCompletionRate: number | null
}

export function summarize(quests: ExportableQuest[]): ExportSummary {
  const total = quests.reduce(
    (acc, quest) => {
      acc.totalEnrollees += quest.enrollees
      acc.totalMilestones += quest.milestones
      acc.totalCompletedMilestones += quest.completedMilestones
      acc.totalPoolBalance += quest.poolBalance
      return acc
    },
    {
      totalEnrollees: 0,
      totalMilestones: 0,
      totalCompletedMilestones: 0,
      totalPoolBalance: 0n,
    }
  )

  const possible = quests.reduce((sum, quest) => sum + quest.milestones * quest.enrollees, 0)
  return {
    questCount: quests.length,
    ...total,
    overallCompletionRate:
      possible > 0 ? total.totalCompletedMilestones / possible : null,
  }
}

function percent(rate: number | null): string {
  return rate === null ? "n/a" : `${(rate * 100).toFixed(1)}%`
}

/**
 * Builds the full CSV report: a summary block, a per-quest table and the
 * enrollment-over-time series, separated by blank lines.
 */
export function buildAnalyticsCsv(quests: ExportableQuest[], range: DateRange): string {
  const summary = summarize(quests)
  const from = range.from || "beginning"
  const to = range.to || "now"
  const lines: string[] = []

  lines.push(toCsvRow(["Lernza creator analytics"]))
  lines.push(toCsvRow(["Date range", `${from} to ${to}`]))
  lines.push(toCsvRow(["Generated", new Date().toISOString()]))
  lines.push("")
  lines.push(toCsvRow(["Summary"]))
  lines.push(toCsvRow(["Quests", summary.questCount]))
  lines.push(toCsvRow(["Total enrollments", summary.totalEnrollees]))
  lines.push(toCsvRow(["Total milestones", summary.totalMilestones]))
  lines.push(toCsvRow(["Completed milestones", summary.totalCompletedMilestones]))
  lines.push(toCsvRow(["Completion rate", percent(summary.overallCompletionRate)]))
  lines.push(toCsvRow(["Total pool balance", summary.totalPoolBalance.toString()]))
  lines.push("")
  lines.push(toCsvRow(["Quests"]))
  lines.push(
    toCsvRow([
      "ID",
      "Name",
      "Created",
      "Enrollees",
      "Milestones",
      "Completed milestones",
      "Completion rate",
      "Pool balance",
    ])
  )
  for (const quest of [...quests].sort((a, b) => a.id - b.id)) {
    lines.push(
      toCsvRow([
        quest.id,
        quest.name,
        toIsoDate(quest.createdAt),
        quest.enrollees,
        quest.milestones,
        quest.completedMilestones,
        percent(completionRate(quest)),
        quest.poolBalance.toString(),
      ])
    )
  }
  lines.push("")
  lines.push(toCsvRow(["Enrollments by quest creation month"]))
  lines.push(toCsvRow(["Month", "Quests created", "Enrollees", "Cumulative enrollees"]))
  for (const bucket of buildEnrollmentSeries(quests)) {
    lines.push(
      toCsvRow([bucket.month, bucket.quests, bucket.enrollees, bucket.cumulativeEnrollees])
    )
  }

  return lines.join("\n")
}

/** Triggers a client-side download of `contents` as `filename`. */
export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Opens the browser print dialog, where "Save as PDF" produces the report.
 *
 * A bundled PDF library (jsPDF and friends) is 150-350 KB, which does not fit
 * the 200 KB script budget in `budget.json`; the print pipeline renders the
 * recharts SVG already on screen at no bundle cost.
 */
export function exportPdf(): void {
  if (typeof window === "undefined") return
  window.print()
}

/** `lernza-analytics-2026-01-01-to-2026-01-31.csv` */
export function analyticsFilename(range: DateRange, extension: string): string {
  const from = range.from || "all"
  const to = range.to || "all"
  return `lernza-analytics-${from}-to-${to}.${extension}`
}
