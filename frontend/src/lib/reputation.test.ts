import { describe, expect, it } from "vitest"

import {
  ABANDONMENT_PENALTY,
  buildReputationEvents,
  calculateReputation,
  clampScore,
  compareByReputation,
  COMPLETION_POINTS,
  CONFIDENCE_FULL_AT,
  decayFactor,
  getTier,
  HALF_LIFE_DAYS,
  MAX_SCORE,
  MIN_SCORE,
  pointsForEvent,
  type QuestOutcome,
  type ReputationEvent,
  type ReputationSummary,
  STARTING_SCORE,
  summarizeByRole,
} from "./reputation"

const NOW = Date.UTC(2025, 0, 1)
const DAY_MS = 24 * 60 * 60 * 1000
const daysAgo = (days: number) => NOW - days * DAY_MS

function event(overrides: Partial<ReputationEvent> = {}): ReputationEvent {
  return {
    type: "quest_completed",
    role: "participant",
    timestamp: NOW,
    ...overrides,
  }
}

describe("calculateReputation", () => {
  it("returns the starting score for a subject with no history", () => {
    const summary = calculateReputation([], { now: NOW })

    expect(summary).toEqual<ReputationSummary>({
      score: STARTING_SCORE,
      tier: "Newcomer",
      completionRate: null,
      averageRating: null,
      ratingCount: 0,
      interactions: 0,
      confidence: 0,
    })
  })

  it("rewards a recent completion with full points", () => {
    const summary = calculateReputation([event({ type: "quest_completed" })], { now: NOW })

    expect(summary.score).toBe(STARTING_SCORE + COMPLETION_POINTS)
    expect(summary.completionRate).toBe(1)
    expect(summary.averageRating).toBeNull()
    expect(summary.confidence).toBeCloseTo(1 / CONFIDENCE_FULL_AT)
  })

  it("penalizes a recent abandonment", () => {
    const summary = calculateReputation([event({ type: "quest_abandoned" })], { now: NOW })

    expect(summary.score).toBe(STARTING_SCORE - ABANDONMENT_PENALTY)
    expect(summary.completionRate).toBe(0)
  })

  it("credits creators for hosting and debits them for canceling", () => {
    const hosted = calculateReputation([event({ type: "quest_hosted", role: "creator" })], {
      now: NOW,
    })
    const canceled = calculateReputation([event({ type: "quest_canceled", role: "creator" })], {
      now: NOW,
    })

    expect(hosted.score).toBe(95)
    expect(canceled.score).toBe(15)
  })

  it("halves a contribution that is exactly one half-life old", () => {
    const summary = calculateReputation([event({ timestamp: daysAgo(HALF_LIFE_DAYS) })], {
      now: NOW,
    })

    // 45 * 0.5 = 22.5 -> round(72.5) = 73
    expect(summary.score).toBe(73)
  })

  it("applies continuous decay for arbitrary ages", () => {
    const summary = calculateReputation([event({ timestamp: daysAgo(90) })], { now: NOW })

    // 45 * 2^(-0.5) ≈ 31.82 -> round(81.82) = 82
    expect(summary.score).toBe(82)
  })

  it("weights higher-stakes quests more heavily", () => {
    const summary = calculateReputation([event({ weight: 2 })], { now: NOW })

    expect(summary.score).toBe(STARTING_SCORE + COMPLETION_POINTS * 2)
  })

  it("treats negative weights as zero", () => {
    const summary = calculateReputation([event({ weight: -5 })], { now: NOW })

    expect(summary.score).toBe(STARTING_SCORE)
  })

  it("converts star ratings into points around the neutral rating", () => {
    const fiveStar = calculateReputation([event({ type: "rating_received", rating: 5 })], {
      now: NOW,
    })
    const neutral = calculateReputation([event({ type: "rating_received", rating: 3 })], {
      now: NOW,
    })
    const oneStar = calculateReputation([event({ type: "rating_received", rating: 1 })], {
      now: NOW,
    })

    expect(fiveStar.score).toBe(80)
    expect(neutral.score).toBe(50)
    expect(oneStar.score).toBe(20)
  })

  it("clamps out-of-range and invalid ratings before scoring", () => {
    const tooHigh = calculateReputation([event({ type: "rating_received", rating: 9 })], {
      now: NOW,
    })
    const tooLow = calculateReputation([event({ type: "rating_received", rating: 0 })], {
      now: NOW,
    })
    const notANumber = calculateReputation(
      [event({ type: "rating_received", rating: Number.NaN })],
      { now: NOW }
    )

    expect(tooHigh.score).toBe(80) // clamped to 5 stars
    expect(tooLow.score).toBe(20) // clamped to 1 star
    expect(notANumber.score).toBe(STARTING_SCORE) // treated as neutral
  })

  it("reports rating statistics without counting ratings as engagements", () => {
    const summary = calculateReputation(
      [
        event({ type: "rating_received", rating: 5 }),
        event({ type: "rating_received", rating: 4 }),
      ],
      { now: NOW }
    )

    expect(summary.ratingCount).toBe(2)
    expect(summary.averageRating).toBe(4.5)
    expect(summary.completionRate).toBeNull()
  })

  it("rounds the average rating to two decimals", () => {
    const summary = calculateReputation(
      [
        event({ type: "rating_received", rating: 5 }),
        event({ type: "rating_received", rating: 4 }),
        event({ type: "rating_received", rating: 4 }),
      ],
      { now: NOW }
    )

    expect(summary.averageRating).toBe(4.33)
  })

  it("computes a completion rate across mixed engagements", () => {
    const summary = calculateReputation(
      [
        event({ type: "quest_completed" }),
        event({ type: "quest_completed" }),
        event({ type: "quest_hosted", role: "creator" }),
        event({ type: "quest_abandoned" }),
      ],
      { now: NOW }
    )

    expect(summary.completionRate).toBe(0.75)
  })

  it("clamps scores to the maximum", () => {
    const events = Array.from({ length: 100 }, () => event({ type: "quest_completed" }))
    const summary = calculateReputation(events, { now: NOW })

    expect(summary.score).toBe(MAX_SCORE)
    expect(summary.tier).toBe("Platinum")
  })

  it("clamps scores to the minimum", () => {
    const events = Array.from({ length: 100 }, () => event({ type: "quest_abandoned" }))
    const summary = calculateReputation(events, { now: NOW })

    expect(summary.score).toBe(MIN_SCORE)
    expect(summary.tier).toBe("Newcomer")
  })

  it("caps confidence at one once enough interactions accrue", () => {
    const events = Array.from({ length: CONFIDENCE_FULL_AT + 4 }, () => event())
    const summary = calculateReputation(events, { now: NOW })

    expect(summary.confidence).toBe(1)
  })

  it("defaults the reference time to now when not provided", () => {
    const summary = calculateReputation([event({ timestamp: Date.now() })])

    expect(Number.isFinite(summary.score)).toBe(true)
    expect(summary.score).toBeGreaterThanOrEqual(MIN_SCORE)
  })
})

describe("decayFactor", () => {
  it("does not decay brand new events", () => {
    expect(decayFactor(0)).toBe(1)
  })

  it("never decays future-dated events", () => {
    expect(decayFactor(-30)).toBe(1)
  })

  it("halves the value at one half-life", () => {
    expect(decayFactor(HALF_LIFE_DAYS)).toBeCloseTo(0.5)
  })

  it("honours a custom half-life", () => {
    expect(decayFactor(30, 30)).toBeCloseTo(0.5)
  })
})

describe("pointsForEvent", () => {
  it("maps each known event type to its point value", () => {
    expect(pointsForEvent(event({ type: "quest_completed" }))).toBe(COMPLETION_POINTS)
    expect(pointsForEvent(event({ type: "quest_hosted" }))).toBe(45)
    expect(pointsForEvent(event({ type: "quest_abandoned" }))).toBe(-ABANDONMENT_PENALTY)
    expect(pointsForEvent(event({ type: "quest_canceled" }))).toBe(-35)
    expect(pointsForEvent(event({ type: "rating_received", rating: 5 }))).toBe(30)
  })

  it("defaults a rating event with no rating to neutral", () => {
    expect(pointsForEvent(event({ type: "rating_received" }))).toBe(0)
  })

  it("returns zero for unknown event types", () => {
    const unknown = {
      type: "mystery",
      role: "participant",
      timestamp: NOW,
    } as unknown as ReputationEvent
    expect(pointsForEvent(unknown)).toBe(0)
  })
})

describe("getTier", () => {
  it("resolves the tier at each boundary", () => {
    expect(getTier(99)).toBe("Newcomer")
    expect(getTier(100)).toBe("Bronze")
    expect(getTier(299)).toBe("Bronze")
    expect(getTier(300)).toBe("Silver")
    expect(getTier(499)).toBe("Silver")
    expect(getTier(500)).toBe("Gold")
    expect(getTier(749)).toBe("Gold")
    expect(getTier(750)).toBe("Platinum")
  })

  it("clamps out-of-range scores before resolving", () => {
    expect(getTier(-100)).toBe("Newcomer")
    expect(getTier(5000)).toBe("Platinum")
  })
})

describe("clampScore", () => {
  it("bounds values to the valid score range", () => {
    expect(clampScore(-1)).toBe(MIN_SCORE)
    expect(clampScore(10_000)).toBe(MAX_SCORE)
    expect(clampScore(250)).toBe(250)
  })
})

describe("summarizeByRole", () => {
  it("splits events into creator, participant and overall summaries", () => {
    const events: ReputationEvent[] = [
      event({ type: "quest_hosted", role: "creator" }),
      event({ type: "quest_completed", role: "participant" }),
      event({ type: "quest_abandoned", role: "participant" }),
    ]

    const { creator, participant, overall } = summarizeByRole(events, { now: NOW })

    expect(creator.score).toBe(95)
    expect(creator.interactions).toBe(1)
    expect(participant.interactions).toBe(2)
    expect(participant.completionRate).toBe(0.5)
    expect(overall.interactions).toBe(3)
  })
})

describe("compareByReputation", () => {
  const summaryFor = (events: ReputationEvent[]) => calculateReputation(events, { now: NOW })

  it("orders subjects from most to least reputable", () => {
    const strong = summaryFor(Array.from({ length: 5 }, () => event({ type: "quest_completed" })))
    const weak = summaryFor([event({ type: "quest_abandoned" })])

    const ranked = [weak, strong].sort(compareByReputation)

    expect(ranked[0]).toBe(strong)
    expect(ranked[1]).toBe(weak)
  })

  it("breaks score ties using confidence", () => {
    const base: ReputationSummary = {
      score: 200,
      tier: "Bronze",
      completionRate: 1,
      averageRating: null,
      ratingCount: 0,
      interactions: 2,
      confidence: 0.25,
    }
    const moreConfident: ReputationSummary = { ...base, confidence: 0.9 }

    expect(compareByReputation(base, moreConfident)).toBeGreaterThan(0)
    expect(compareByReputation(moreConfident, base)).toBeLessThan(0)
  })

  it("breaks score and confidence ties using average rating", () => {
    const base: ReputationSummary = {
      score: 200,
      tier: "Bronze",
      completionRate: 1,
      averageRating: 3,
      ratingCount: 1,
      interactions: 2,
      confidence: 0.25,
    }
    const betterRated: ReputationSummary = { ...base, averageRating: 5 }

    expect(compareByReputation(base, betterRated)).toBeGreaterThan(0)
  })
})

describe("buildReputationEvents", () => {
  it("maps each outcome status onto the matching event type", () => {
    const outcomes: QuestOutcome[] = [
      { role: "participant", status: "completed", timestamp: NOW },
      { role: "participant", status: "abandoned", timestamp: NOW },
      { role: "creator", status: "hosted", timestamp: NOW },
      { role: "creator", status: "canceled", timestamp: NOW },
    ]

    const events = buildReputationEvents(outcomes)

    expect(events.map(e => e.type)).toEqual([
      "quest_completed",
      "quest_abandoned",
      "quest_hosted",
      "quest_canceled",
    ])
  })

  it("emits a rating event only when a rating is present", () => {
    const outcomes: QuestOutcome[] = [
      { role: "participant", status: "completed", timestamp: NOW, rating: 4 },
      { role: "participant", status: "completed", timestamp: NOW, rating: null },
      { role: "participant", status: "completed", timestamp: NOW },
    ]

    const events = buildReputationEvents(outcomes)
    const ratingEvents = events.filter(e => e.type === "rating_received")

    expect(ratingEvents).toHaveLength(1)
    expect(ratingEvents[0].rating).toBe(4)
  })

  it("accepts epoch, ISO string and Date timestamps", () => {
    const outcomes: QuestOutcome[] = [
      { role: "participant", status: "completed", timestamp: NOW },
      { role: "participant", status: "completed", timestamp: new Date(NOW).toISOString() },
      { role: "participant", status: "completed", timestamp: new Date(NOW) },
    ]

    const events = buildReputationEvents(outcomes)

    expect(events).toHaveLength(3)
    expect(events.every(e => e.timestamp === NOW)).toBe(true)
  })

  it("skips outcomes with an unparseable timestamp", () => {
    const outcomes: QuestOutcome[] = [
      { role: "participant", status: "completed", timestamp: "not-a-date" },
      { role: "participant", status: "completed", timestamp: NOW },
    ]

    const events = buildReputationEvents(outcomes)

    expect(events).toHaveLength(1)
    expect(events[0].timestamp).toBe(NOW)
  })

  it("passes the per-quest weight through to both events", () => {
    const outcomes: QuestOutcome[] = [
      { role: "creator", status: "hosted", timestamp: NOW, rating: 5, weight: 3 },
    ]

    const events = buildReputationEvents(outcomes)

    expect(events).toHaveLength(2)
    expect(events.every(e => e.weight === 3)).toBe(true)
  })

  it("produces events that feed straight into calculateReputation", () => {
    const outcomes: QuestOutcome[] = [
      { role: "participant", status: "completed", timestamp: NOW, rating: 5 },
    ]

    const summary = calculateReputation(buildReputationEvents(outcomes), { now: NOW })

    // completion (+45) and a 5-star rating (+30) on top of the starting score
    expect(summary.score).toBe(STARTING_SCORE + COMPLETION_POINTS + 30)
    expect(summary.ratingCount).toBe(1)
    expect(summary.averageRating).toBe(5)
  })
})
