/**
 * Reputation system for Lernza creators and participants.
 *
 * Reputation is derived from an append-only list of {@link ReputationEvent}s
 * (quest completions, abandonments and fairness ratings). Each event
 * contributes a fixed number of points that decays over time, so recent
 * behaviour matters more than old behaviour. The resulting score is clamped to
 * a fixed range and mapped onto a human-readable {@link ReputationTier}.
 *
 * The module is intentionally pure and framework-agnostic so it can be unit
 * tested in isolation and reused by both the quest UI and any off-chain
 * indexing service.
 */

/** A user can earn reputation as the host of a quest or as a participant. */
export type ReputationRole = "creator" | "participant"

/** Human readable reputation tiers, ordered from lowest to highest. */
export type ReputationTier = "Newcomer" | "Bronze" | "Silver" | "Gold" | "Platinum"

/** The kinds of events that move a user's reputation. */
export type ReputationEventType =
  "quest_completed" | "quest_abandoned" | "quest_hosted" | "quest_canceled" | "rating_received"

export interface ReputationEvent {
  /** What happened. */
  type: ReputationEventType
  /** Whether the user earned this as a creator or a participant. */
  role: ReputationRole
  /** When the event happened, in milliseconds since the Unix epoch. */
  timestamp: number
  /** Star rating (1-5) for `rating_received` events. Ignored otherwise. */
  rating?: number
  /**
   * Optional multiplier used to weight larger or higher-stakes quests more
   * heavily. Defaults to `1` and is clamped to be non-negative.
   */
  weight?: number
}

export interface ReputationSummary {
  /** Final reputation score, clamped to [{@link MIN_SCORE}, {@link MAX_SCORE}]. */
  score: number
  /** Tier derived from {@link score}. */
  tier: ReputationTier
  /**
   * Share of engagements that ended positively (completed/hosted) versus
   * negatively (abandoned/canceled). `null` when there are no engagements.
   */
  completionRate: number | null
  /** Mean fairness rating (1-5), rounded to 2 decimals, or `null` if unrated. */
  averageRating: number | null
  /** Number of fairness ratings received. */
  ratingCount: number
  /** Total number of reputation events considered. */
  interactions: number
  /**
   * How trustworthy the score is, from 0 (no history) to 1, reaching 1 once a
   * user has at least {@link CONFIDENCE_FULL_AT} interactions.
   */
  confidence: number
}

/** Score assigned to a brand new account with no history. */
export const STARTING_SCORE = 50
/** Lowest possible score. */
export const MIN_SCORE = 0
/** Highest possible score. */
export const MAX_SCORE = 1000

/** Points earned by a participant for finishing a quest. */
export const COMPLETION_POINTS = 45
/** Points earned by a creator for delivering a completed quest. */
export const HOSTING_POINTS = 45
/** Points lost by a participant who abandons a quest they joined. */
export const ABANDONMENT_PENALTY = 35
/** Points lost by a creator who cancels a funded quest. */
export const CANCELLATION_PENALTY = 35

/** A rating equal to this value is neutral and moves the score by zero. */
export const NEUTRAL_RATING = 3
/** Points awarded per star above (or below) {@link NEUTRAL_RATING}. */
export const RATING_POINTS_PER_STAR = 15

/** Number of days after which a contribution decays to half its value. */
export const HALF_LIFE_DAYS = 180
/** Interactions required before {@link ReputationSummary.confidence} reaches 1. */
export const CONFIDENCE_FULL_AT = 8

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Inclusive lower score bounds for each tier, ordered from highest to lowest so
 * {@link getTier} can return the first match.
 */
export const TIER_THRESHOLDS: ReadonlyArray<{ tier: ReputationTier; min: number }> = [
  { tier: "Platinum", min: 750 },
  { tier: "Gold", min: 500 },
  { tier: "Silver", min: 300 },
  { tier: "Bronze", min: 100 },
  { tier: "Newcomer", min: MIN_SCORE },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Clamp an arbitrary number into the valid reputation score range. */
export function clampScore(value: number): number {
  return clamp(value, MIN_SCORE, MAX_SCORE)
}

/** Map a raw star rating onto the valid 1-5 range. */
function normalizeRating(rating: number): number {
  if (!Number.isFinite(rating)) return NEUTRAL_RATING
  return clamp(Math.round(rating), 1, 5)
}

/**
 * Time-decay multiplier for a contribution that is `ageDays` old. Events in the
 * future (negative age) are treated as brand new and never decay.
 */
export function decayFactor(ageDays: number, halfLifeDays = HALF_LIFE_DAYS): number {
  const age = Math.max(0, ageDays)
  return Math.pow(2, -age / halfLifeDays)
}

/** Base points contributed by an event before weighting and time decay. */
export function pointsForEvent(event: ReputationEvent): number {
  switch (event.type) {
    case "quest_completed":
      return COMPLETION_POINTS
    case "quest_hosted":
      return HOSTING_POINTS
    case "quest_abandoned":
      return -ABANDONMENT_PENALTY
    case "quest_canceled":
      return -CANCELLATION_PENALTY
    case "rating_received":
      return (
        (normalizeRating(event.rating ?? NEUTRAL_RATING) - NEUTRAL_RATING) * RATING_POINTS_PER_STAR
      )
    default:
      return 0
  }
}

/** Resolve the tier for a given score. */
export function getTier(score: number): ReputationTier {
  const clamped = clampScore(score)
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (clamped >= min) return tier
  }
  return "Newcomer"
}

function isPositiveEngagement(type: ReputationEventType): boolean {
  return type === "quest_completed" || type === "quest_hosted"
}

function isNegativeEngagement(type: ReputationEventType): boolean {
  return type === "quest_abandoned" || type === "quest_canceled"
}

/**
 * Compute a full reputation summary from a list of events.
 *
 * @param events Reputation events for a single subject. Order does not matter.
 * @param options.now Reference time in ms used for decay (defaults to now).
 */
export function calculateReputation(
  events: ReputationEvent[],
  options: { now?: number } = {}
): ReputationSummary {
  const now = options.now ?? Date.now()

  let scoreTotal = STARTING_SCORE
  let positiveEngagements = 0
  let negativeEngagements = 0
  let ratingSum = 0
  let ratingCount = 0

  for (const event of events) {
    const weight = Math.max(0, event.weight ?? 1)
    const ageDays = (now - event.timestamp) / DAY_MS
    scoreTotal += pointsForEvent(event) * weight * decayFactor(ageDays)

    if (isPositiveEngagement(event.type)) positiveEngagements += 1
    else if (isNegativeEngagement(event.type)) negativeEngagements += 1

    if (event.type === "rating_received") {
      ratingSum += normalizeRating(event.rating ?? NEUTRAL_RATING)
      ratingCount += 1
    }
  }

  const engagements = positiveEngagements + negativeEngagements
  const completionRate = engagements === 0 ? null : positiveEngagements / engagements
  const averageRating = ratingCount === 0 ? null : Math.round((ratingSum / ratingCount) * 100) / 100

  const score = Math.round(clampScore(scoreTotal))

  return {
    score,
    tier: getTier(score),
    completionRate,
    averageRating,
    ratingCount,
    interactions: events.length,
    confidence: clamp(events.length / CONFIDENCE_FULL_AT, 0, 1),
  }
}

/**
 * Break a mixed event stream into creator, participant and overall summaries.
 * Handy for profile pages that show both hats a user wears.
 */
export function summarizeByRole(
  events: ReputationEvent[],
  options: { now?: number } = {}
): { creator: ReputationSummary; participant: ReputationSummary; overall: ReputationSummary } {
  return {
    creator: calculateReputation(
      events.filter(event => event.role === "creator"),
      options
    ),
    participant: calculateReputation(
      events.filter(event => event.role === "participant"),
      options
    ),
    overall: calculateReputation(events, options),
  }
}

/**
 * Comparator for sorting subjects from most to least reputable. Sorts by score,
 * then by confidence, then by average rating so ties resolve deterministically.
 */
export function compareByReputation(a: ReputationSummary, b: ReputationSummary): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.confidence !== a.confidence) return b.confidence - a.confidence
  return (b.averageRating ?? 0) - (a.averageRating ?? 0)
}

/** Raw outcome of a single quest, as produced by on-chain/off-chain indexers. */
export interface QuestOutcome {
  role: ReputationRole
  status: "completed" | "abandoned" | "hosted" | "canceled"
  /** Event time as ms epoch, ISO string or `Date`. */
  timestamp: number | string | Date
  /** Optional fairness rating (1-5) attached to the outcome. */
  rating?: number | null
  /** Optional per-quest weight multiplier. */
  weight?: number
}

const STATUS_TO_EVENT: Record<QuestOutcome["status"], ReputationEventType> = {
  completed: "quest_completed",
  abandoned: "quest_abandoned",
  hosted: "quest_hosted",
  canceled: "quest_canceled",
}

function toEpochMs(value: number | string | Date): number {
  if (typeof value === "number") return value
  return new Date(value).getTime()
}

/**
 * Convert raw quest outcomes into reputation events, degrading gracefully when
 * fairness ratings are missing (they simply don't emit a rating event). Any
 * outcome with an unparseable timestamp is skipped rather than poisoning the
 * score with `NaN`.
 */
export function buildReputationEvents(outcomes: QuestOutcome[]): ReputationEvent[] {
  const events: ReputationEvent[] = []

  for (const outcome of outcomes) {
    const timestamp = toEpochMs(outcome.timestamp)
    if (!Number.isFinite(timestamp)) continue

    events.push({
      type: STATUS_TO_EVENT[outcome.status],
      role: outcome.role,
      timestamp,
      weight: outcome.weight,
    })

    if (outcome.rating != null) {
      events.push({
        type: "rating_received",
        role: outcome.role,
        timestamp,
        rating: outcome.rating,
        weight: outcome.weight,
      })
    }
  }

  return events
}
