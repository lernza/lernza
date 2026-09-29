import { describe, expect, it } from "vitest"
import {
  analyticsFilename,
  buildAnalyticsCsv,
  buildEnrollmentSeries,
  completionRate,
  escapeCsvField,
  filterByCreatedAt,
  summarize,
  toIsoDate,
  type ExportableQuest,
} from "@/lib/analytics-export"

const DAY = 86_400
const base = Date.parse("2026-01-01T00:00:00Z") / 1000

function quest(overrides: Partial<ExportableQuest> = {}): ExportableQuest {
  return {
    id: 1,
    name: "Learn Soroban",
    createdAt: base,
    enrollees: 2,
    milestones: 3,
    completedMilestones: 3,
    poolBalance: 100n,
    ...overrides,
  }
}

describe("filterByCreatedAt", () => {
  const items = [
    quest({ id: 1, createdAt: base }),
    quest({ id: 2, createdAt: base + 10 * DAY }),
    quest({ id: 3, createdAt: base + 40 * DAY }),
  ]

  it("keeps only quests inside the range", () => {
    const result = filterByCreatedAt(items, { from: "2026-01-05", to: "2026-02-05" })
    expect(result.map(q => q.id)).toEqual([2])
  })

  it("treats an empty bound as open-ended", () => {
    expect(filterByCreatedAt(items, { from: "", to: "2026-01-05" }).map(q => q.id)).toEqual([1])
    expect(filterByCreatedAt(items, { from: "2026-01-20", to: "" }).map(q => q.id)).toEqual([3])
    expect(filterByCreatedAt(items, { from: "", to: "" })).toHaveLength(3)
  })

  it("includes the whole end day", () => {
    const lastSecondOfDay = base + DAY - 1
    const result = filterByCreatedAt([quest({ createdAt: lastSecondOfDay })], {
      from: "2026-01-01",
      to: "2026-01-01",
    })
    expect(result).toHaveLength(1)
  })

  it("excludes a quest one second past the end day", () => {
    const result = filterByCreatedAt([quest({ createdAt: base + DAY })], {
      from: "2026-01-01",
      to: "2026-01-01",
    })
    expect(result).toHaveLength(0)
  })

  it("ignores an unparseable bound rather than dropping everything", () => {
    expect(filterByCreatedAt(items, { from: "not-a-date", to: "also-bad" })).toHaveLength(3)
  })
})

describe("escapeCsvField", () => {
  it("quotes values containing separators", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvField("line\nbreak")).toBe('"line\nbreak"')
  })

  it("neutralises spreadsheet formula injection", () => {
    expect(escapeCsvField("=1+1")).toBe("'=1+1")
    expect(escapeCsvField("+cmd")).toBe("'+cmd")
    expect(escapeCsvField("-2")).toBe("'-2")
    expect(escapeCsvField("@SUM(A1)")).toBe("'@SUM(A1)")
  })

  it("leaves ordinary values untouched", () => {
    expect(escapeCsvField("Learn Soroban")).toBe("Learn Soroban")
    expect(escapeCsvField("")).toBe("")
  })
})

describe("completionRate", () => {
  it("divides completed by possible", () => {
    expect(completionRate(quest({ milestones: 4, enrollees: 5, completedMilestones: 10 }))).toBe(0.5)
  })

  it("is null when nothing was possible", () => {
    expect(completionRate(quest({ milestones: 0, enrollees: 3, completedMilestones: 0 }))).toBeNull()
  })
})

describe("buildEnrollmentSeries", () => {
  it("buckets by creation month and accumulates", () => {
    const series = buildEnrollmentSeries([
      quest({ id: 1, createdAt: base, enrollees: 2 }),
      quest({ id: 2, createdAt: base + DAY, enrollees: 3 }),
      quest({ id: 3, createdAt: base + 40 * DAY, enrollees: 1 }),
    ])

    expect(series).toEqual([
      { month: "2026-01", quests: 2, enrollees: 5, cumulativeEnrollees: 5 },
      { month: "2026-02", quests: 1, enrollees: 1, cumulativeEnrollees: 6 },
    ])
  })

  it("sorts months chronologically regardless of input order", () => {
    const series = buildEnrollmentSeries([
      quest({ id: 1, createdAt: base + 40 * DAY }),
      quest({ id: 2, createdAt: base }),
    ])
    expect(series.map(b => b.month)).toEqual(["2026-01", "2026-02"])
  })
})

describe("summarize", () => {
  it("totals enrollees, milestones and balances", () => {
    const summary = summarize([
      quest({ enrollees: 2, milestones: 2, completedMilestones: 1, poolBalance: 50n }),
      quest({ enrollees: 3, milestones: 2, completedMilestones: 3, poolBalance: 70n }),
    ])

    expect(summary.questCount).toBe(2)
    expect(summary.totalEnrollees).toBe(5)
    expect(summary.totalPoolBalance).toBe(120n)
    // 4 completed out of (2*2 + 2*3) = 10 possible.
    expect(summary.overallCompletionRate).toBeCloseTo(0.4)
  })

  it("reports a null rate when nothing was possible", () => {
    expect(summarize([quest({ milestones: 0 })]).overallCompletionRate).toBeNull()
  })
})

describe("buildAnalyticsCsv", () => {
  const quests = [
    quest({ id: 2, name: "Second, with comma", createdAt: base + 40 * DAY, enrollees: 3 }),
    quest({ id: 1, name: "=HYPERLINK(\"evil\")", enrollees: 2 }),
  ]

  it("includes the summary, the quest table and the series", () => {
    const csv = buildAnalyticsCsv(quests, { from: "2026-01-01", to: "2026-02-10" })

    expect(csv).toContain("Date range,2026-01-01 to 2026-02-10")
    expect(csv).toContain("Quests,2")
    expect(csv).toContain("Enrollments by quest creation month")
    expect(csv).toContain("Month,Quests created,Enrollees,Cumulative enrollees")
  })

  it("sorts quests by id", () => {
    const csv = buildAnalyticsCsv(quests, { from: "", to: "" })
    expect(csv.indexOf("1,'=HYPERLINK")).toBeLessThan(csv.indexOf("2,\"Second"))
  })

  it("escapes a quest name containing a comma", () => {
    expect(buildAnalyticsCsv(quests, { from: "", to: "" })).toContain('"Second, with comma"')
  })

  it("neutralises a formula in a quest name", () => {
    expect(buildAnalyticsCsv(quests, { from: "", to: "" })).toContain("'=HYPERLINK")
  })

  it("labels an unbounded range", () => {
    expect(buildAnalyticsCsv(quests, { from: "", to: "" })).toContain("beginning to now")
  })

  it("renders a bigint balance without scientific notation", () => {
    const csv = buildAnalyticsCsv([quest({ poolBalance: 12345678901234567890n })], {
      from: "",
      to: "",
    })
    expect(csv).toContain("12345678901234567890")
  })

  it("reports n/a rather than dividing by zero", () => {
    const csv = buildAnalyticsCsv([quest({ milestones: 0, completedMilestones: 0 })], {
      from: "",
      to: "",
    })
    expect(csv).toContain("Completion rate,n/a")
  })
})

describe("toIsoDate and analyticsFilename", () => {
  it("formats a unix timestamp as a UTC date", () => {
    expect(toIsoDate(base)).toBe("2026-01-01")
  })

  it("builds a descriptive filename", () => {
    expect(analyticsFilename({ from: "2026-01-01", to: "2026-01-31" }, "csv")).toBe(
      "lernza-analytics-2026-01-01-to-2026-01-31.csv"
    )
    expect(analyticsFilename({ from: "", to: "" }, "pdf")).toBe(
      "lernza-analytics-all-to-all.pdf"
    )
  })
})
