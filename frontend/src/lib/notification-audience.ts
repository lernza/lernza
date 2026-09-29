/**
 * Notification audience routing (#1646).
 *
 * The event stream in `use-quest-events.ts` polls every contract the frontend
 * knows about, so it sees every quest's activity on the network — not just the
 * viewer's. Routing that stream straight into `addToast` meant that any wallet
 * connected to the app received a toast for every enrollment, reward payout and
 * milestone completion on mainnet, including quests they have no part in.
 *
 * This module decides *whether* a parsed event concerns the viewer, and *who*
 * the viewer is in relation to it (the learner it happened to, or the creator
 * of the quest it happened in). It is pure: no hooks, no RPC, no clock. The
 * hook supplies the viewer's participation and applies the result.
 *
 * ## Why participation and not just addresses
 *
 * Most payloads do name an address — the `enrollee` who earned a reward, the
 * `actor` who set a distribution mode. But not all of them, and an address match
 * is not sufficient anyway: a learner who enrolled in quest 7 and later left
 * should not keep receiving quest 7's verification results. The viewer is
 * therefore classified by *quest participation*, which the `useUserRole` hook
 * already resolves from the chain, and the payload addresses are used only to
 * break ties and to decide which of the two roles a notification is for.
 */

/** Which side of a quest the viewer is on for a given event. */
export type ViewerRole = "learner" | "creator" | "both"

/**
 * The subset of a parsed event that routing needs. Kept structural so this
 * module does not import the hook's `ParsedEvent` (which would pull the RPC
 * client in and make routing untestable in isolation).
 */
export interface RoutableEvent {
  type: string
  questId?: number
  /** The account the event is about, e.g. the learner who earned a reward. */
  enrollee?: string
  /** The acting account, or the quest owner for `enrollee_added`. */
  actor?: string
  /** Account that emitted the event, e.g. the reviewer or funder. */
  authority?: string
  /** Account that minted a certificate or opened a dispute. */
  admin?: string
}

export interface ViewerParticipation {
  address: string | null
  /** Quest ids where the viewer is the creator. */
  ownedQuestIds: readonly number[]
  /** Quest ids where the viewer is an enrollee. */
  enrolledQuestIds: readonly number[]
}

export const NO_PARTICIPATION: ViewerParticipation = {
  address: null,
  ownedQuestIds: [],
  enrolledQuestIds: [],
}

/**
 * The event types that are allowed to produce a notification.
 *
 * This is an allowlist rather than a list of exclusions, and it is the reason
 * the fallback below can be a suppression. Anything the stream parses but is
 * not named here — including a topic added to `EventTopicKey` before anyone has
 * decided who should hear about it — is dropped rather than shown to every
 * connected wallet. Adding an event to the stream and routing it are therefore
 * two separate, deliberate steps.
 */
const ROUTABLE_EVENTS: ReadonlySet<string> = new Set([
  "milestone_completed",
  "peer_approved",
  "partial_completion",
  "milestone_feedback",
  "certificate_minted",
  "certificate_mint_failed",
  "dispute_initiated",
  "dispute_resolved",
  "reward_distributed",
  "reward_funded",
  "reward_refunded",
  "pending_reward_released",
  "enrollee_added",
  "quest_created",
  "quest_updated",
  "quest_archived",
  "quest_cancelled",
  "creator_verified",
  "creator_verification_revoked",
  "distribution_mode_set",
])

/**
 * Events that concern the creator of the quest rather than the learner, and
 * which are therefore suppressed for a pure learner even on their own quests.
 *
 * `enrollee_added` is the clearest case and the one the issue calls out: a
 * creator wants to know a learner joined. The learner themselves does not need
 * a "someone joined" notification, and the payload's `actor` slot holds the
 * quest owner, which is what makes the creator addressable without an extra
 * on-chain read.
 */
const CREATOR_ONLY_EVENTS: ReadonlySet<string> = new Set([
  "enrollee_added",
  "distribution_mode_set",
])

/**
 * Events that say something about a *person* rather than a quest — an admin
 * rotation, a TTL bump. There is no addressable recipient and no quest to scope
 * them to, so they are only shown to a viewer who is a party to them, which
 * cannot be determined from the payload alone. Suppressed rather than shown to
 * everyone, which is the status quo behaviour.
 */
const NETWORK_WIDE_EVENTS: ReadonlySet<string> = new Set([
  "admin_transferred",
  "quest_ttl_extended",
])

function isParticipant(participation: ViewerParticipation, questId: number | undefined): boolean {
  if (questId === undefined) return false
  return (
    participation.ownedQuestIds.includes(questId) ||
    participation.enrolledQuestIds.includes(questId)
  )
}

/**
 * Decide how a parsed event relates to the viewer.
 *
 * Returns `"creator"` when the notification is for the quest's creator,
 * `"learner"` when it is for the account the event is about, `"both"` when the
 * viewer occupies both roles for that quest, and `null` when the event is not
 * the viewer's to receive.
 *
 * The function is deliberately total: every event type resolves to a value, and
 * the fallback is `null` (suppress). A new event added to the stream without a
 * routing decision therefore fails closed — it produces no notification — rather
 * than defaulting to a toast for every connected wallet, which is the bug this
 * exists to fix.
 */
export function resolveViewerRole(
  event: RoutableEvent,
  participation: ViewerParticipation
): ViewerRole | null {
  const { address } = participation
  if (!address) return null

  // Fail closed: an event with no routing decision produces no notification.
  if (!ROUTABLE_EVENTS.has(event.type)) return null

  // No wallet connected means there is nobody to notify. The hook is disabled
  // in this state, but routing must not depend on that.
  if (NETWORK_WIDE_EVENTS.has(event.type)) return null

  const owned = event.questId !== undefined && participation.ownedQuestIds.includes(event.questId)
  const enrolled =
    event.questId !== undefined && participation.enrolledQuestIds.includes(event.questId)

  // Events naming a specific account, where the viewer may be that account
  // even on a quest they are not otherwise attached to (for example a dispute
  // raised against a submission they no longer appear in). Address equality is
  // checked first so a learner is told about their own milestone even if the
  // participation snapshot is stale.
  const isSubject =
    event.enrollee === address || event.authority === address || event.admin === address
  // For `enrollee_added` the third slot is the quest owner, so a creator is the
  // "subject" of the event; for every other event it is whoever acted.
  const isActor = event.actor === address

  if (CREATOR_ONLY_EVENTS.has(event.type)) {
    if (owned || isActor) return "creator"
    return null
  }

  if (owned && enrolled) return "both"
  if (owned) {
    // A creator watching their own quest. Verification results still concern
    // them, but a network-wide "quest created" does not.
    return isParticipant(participation, event.questId) ? "creator" : null
  }
  if (enrolled || isSubject) return "learner"
  return null
}

/** Convenience predicate for the hook's skip check. */
export function shouldNotifyViewer(
  event: RoutableEvent,
  participation: ViewerParticipation
): boolean {
  return resolveViewerRole(event, participation) !== null
}

/**
 * Whether an event should be shown to the viewer *as the learner it happened
 * to*. A creator watching their quest is told about a learner's progress
 * (that is the creator's interest), but a creator's own `reward_funded` is not
 * a learner notification and should not be phrased as one.
 */
export function isLearnerSubject(
  event: RoutableEvent,
  participation: ViewerParticipation
): boolean {
  const { address } = participation
  if (!address) return false
  return event.enrollee === address
}
