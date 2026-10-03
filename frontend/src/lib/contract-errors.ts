/**
 * Centralized contract error code → human-readable message mapping.
 *
 * Codes come from the Soroban contract `Error` enum variants. When a contract
 * call reverts with `Error(Contract, #N)` the number N is the variant's
 * discriminant — the explicit `= N` value in the Rust `pub enum Error`, which
 * is *not* necessarily its declaration index.
 *
 * Each Lernza contract has its own code space. `NotFound = 1` means "Quest not
 * found" on the quest contract, "Milestone not found" on the milestone
 * contract, and "Reward pool not found" on the rewards contract. Merging the
 * tables is therefore not merely lossy, it is actively wrong: a single merged
 * object makes every lookup of a shared code (1-3, 400) resolve to whichever
 * map was spread last. Lookups are scoped instead — see `mapContractError`.
 *
 * Every table below is written as `satisfies Record<Code, string>` against a
 * `*_ERROR_CODES` map transcribed from the matching `pub enum Error`. Adding a
 * variant to the Rust enum is a compile error here until the message lands,
 * which is what stops the tables drifting apart again. Code 5 is absent from
 * the quest and milestone tables because both contracts declare it as
 * `Reserved5` — a slot held for ABI stability that is never returned.
 */

import { contractAddresses, type ContractName } from "./contracts/config"

/** Contract whose error code space a lookup should be resolved against. */
export type ContractErrorScope = ContractName | "completion"

/**
 * Every scope, in the order unscoped lookups consult them. Order is
 * presentation-only: `mapContractError` requires every candidate to agree.
 */
const ALL_SCOPES: readonly ContractErrorScope[] = [
  "quest",
  "milestone",
  "rewards",
  "certificate",
  "completion",
  "token",
]

// ─── Shared error band ───────────────────────────────────────────────────────

/**
 * Administrative pause. Identical (`= 400`) in every Lernza contract, so it is
 * the one code that is safe to resolve without knowing the contract.
 */
export const CONTRACT_PAUSED_CODE = 400
const CONTRACT_PAUSED_MESSAGE = "This feature is temporarily paused. Please try again later."

// ─── Quest contract ──────────────────────────────────────────────────────────

/** Discriminants from `contracts/quest/src/lib.rs` `pub enum Error`. */
export const QUEST_ERROR_CODES = {
  NotFound: 1,
  Unauthorized: 2,
  InvalidInput: 3,
  AlreadyEnrolled: 4,
  NotEnrolled: 6,
  QuestFull: 7,
  QuestArchived: 8,
  NameTooLong: 9,
  DescriptionTooLong: 10,
  InviteOnly: 11,
  LeaveBlockedByPendingApproval: 12,
  EnrollmentClosed: 13,
  DeadlineExpired: 14,
  InvalidInvite: 15,
  InviteAlreadyUsed: 16,
  QuestCancelled: 17,
  NoPendingTransfer: 18,
  NotTransferNominee: 19,
  NotTransferParty: 20,
  QuestSuspended: 21,
  RemovalBlockedByPendingApproval: 22,
  ReEnrollCooldown: 23,
  Paused: CONTRACT_PAUSED_CODE,
} as const
export type QuestErrorCode = (typeof QUEST_ERROR_CODES)[keyof typeof QUEST_ERROR_CODES]

export const QUEST_CONTRACT_ERRORS = {
  1: "Quest not found.",
  2: "You are not the owner of this quest.",
  3: "Invalid quest details.",
  4: "You are already enrolled in this quest.",
  6: "This learner is not enrolled in this quest.",
  7: "This quest is already full.",
  8: "This quest is archived and no longer accepting changes.",
  9: "The quest title is too long.",
  10: "The quest description is too long.",
  11: "This quest is invite only.",
  12: "You have a submission awaiting review. Wait for it to settle before leaving.",
  13: "Enrollment for this quest is closed.",
  14: "The quest deadline has passed.",
  15: "That invite code is not valid.",
  16: "That invite code has already been used.",
  17: "This quest was cancelled.",
  18: "There is no pending ownership transfer for this quest.",
  19: "You are not the nominated new owner of this quest.",
  20: "Only the current owner or the nominated new owner can do that.",
  21: "This quest is suspended.",
  22: "Removal is blocked while a submission is awaiting review.",
  23: "You must wait before rejoining this quest.",
  400: CONTRACT_PAUSED_MESSAGE,
} as const satisfies Record<QuestErrorCode, string>

// ─── Milestone contract ──────────────────────────────────────────────────────

/**
 * Discriminants from `contracts/milestone/src/lib.rs` `pub enum Error`.
 *
 * This is the single source of truth for milestone error messages: both
 * `contract-errors.ts` and `milestone-client.ts` import `MILESTONE_ERRORS`
 * from here, so a variant added to the contract cannot end up with one wording
 * in the transaction normalizer and a different one (or none) in the shared
 * lookup table.
 */
export const MILESTONE_ERROR_CODES = {
  NotFound: 1,
  Unauthorized: 2,
  InvalidInput: 3,
  AlreadyCompleted: 4,
  InvalidAmount: 6,
  OwnerMismatch: 7,
  NotInitialized: 8,
  AlreadySubmitted: 9,
  NotSubmitted: 10,
  AlreadyApproved: 11,
  NotEnrolled: 12,
  InvalidApprover: 13,
  MilestoneNotUnlocked: 14,
  TitleTooLong: 15,
  DescriptionTooLong: 16,
  BatchTooLarge: 17,
  FlatRewardNotConfigured: 18,
  Overflow: 19,
  CertificateMintFailed: 20,
  DeadlineExpired: 21,
  CircularDependency: 22,
  DisputeNotFound: 23,
  DisputeAlreadyResolved: 24,
  NotEligibleForDispute: 25,
  MilestoneDeadlineExceedsQuest: 26,
  DisputeCooldownActive: 27,
  DisputeAlreadyOpen: 28,
  DisputeReasonTooLong: 29,
  InvalidDisputeOutcome: 30,
  DisputePageTooLarge: 31,
  Paused: CONTRACT_PAUSED_CODE,
} as const
export type MilestoneErrorCode = (typeof MILESTONE_ERROR_CODES)[keyof typeof MILESTONE_ERROR_CODES]

/**
 * Canonical milestone error messages. Covers every discriminant in
 * `MILESTONE_ERROR_CODES` — the `satisfies` clause is what enforces it, so a
 * missing or extra key is a type error rather than a silently absent message.
 */
export const MILESTONE_ERRORS = {
  1: "Milestone not found.",
  2: "You are not authorized to manage milestones for this quest.",
  3: "Invalid milestone details.",
  4: "This milestone has already been verified.",
  6: "The milestone reward amount is invalid.",
  7: "Only the quest owner can manage milestones for this quest.",
  8: "The milestone contract is not configured.",
  9: "You have already submitted this milestone.",
  10: "There is no submission for this milestone.",
  11: "This submission has already been approved.",
  12: "This learner is not enrolled in the quest.",
  13: "You are not allowed to review this submission.",
  14: "Complete the previous milestone first.",
  15: "The milestone title is too long.",
  16: "The milestone description is too long.",
  17: "Too many milestones in one batch.",
  18: "This quest does not use a flat reward pool.",
  19: "The reward calculation overflowed. Try smaller amounts.",
  20: "The completion certificate could not be issued.",
  21: "The quest deadline has passed.",
  22: "Milestone prerequisites cannot form a cycle.",
  23: "No dispute has been opened for this submission.",
  24: "This dispute has already been resolved and cannot be reopened.",
  25: "This submission is not eligible for a dispute. It must have been rejected first.",
  26: "A milestone deadline cannot be later than the quest's own deadline.",
  27: "A dispute for this submission was opened recently. Try again after the cooldown.",
  28: "A dispute is already open for this submission.",
  29: "The dispute reason is too long.",
  30: "That outcome is not valid for a dispute in its current state.",
  31: "The dispute page size is out of range.",
  400: CONTRACT_PAUSED_MESSAGE,
} as const satisfies Record<MilestoneErrorCode, string>

// ─── Rewards contract ────────────────────────────────────────────────────────

/** Discriminants from `contracts/rewards/src/lib.rs` `pub enum Error`. */
export const REWARDS_ERROR_CODES = {
  NotFound: 1,
  Unauthorized: 2,
  InvalidInput: 3,
  InsufficientPool: 4,
  InvalidAmount: 5,
  QuestNotFunded: 6,
  QuestLookupFailed: 7,
  MilestoneNotCompleted: 8,
  MilestoneContractNotInitialized: 9,
  ArithmeticOverflow: 10,
  AlreadyPaid: 11,
  InvalidToken: 12,
  RewardAmountMismatch: 13,
  QuestNotArchived: 14,
  RefundWindowNotOpen: 15,
  QuestNotExpired: 16,
  BatchTooLarge: 17,
  RecipientNotEnrolled: 18,
  InconsistentStats: 19,
  AlreadyInitialized: 99,
  NotInitialized: 100,
  Paused: CONTRACT_PAUSED_CODE,
} as const
export type RewardsErrorCode = (typeof REWARDS_ERROR_CODES)[keyof typeof REWARDS_ERROR_CODES]

export const REWARDS_CONTRACT_ERRORS = {
  1: "Reward pool not found.",
  2: "You are not authorized to distribute this reward.",
  3: "Invalid reward details.",
  4: "The reward pool does not have enough balance.",
  5: "The reward amount is invalid.",
  6: "This quest has no funded reward pool.",
  7: "The quest could not be looked up on-chain.",
  8: "Complete the milestone before claiming its reward.",
  9: "The milestone contract is not configured.",
  10: "The reward calculation overflowed. Try smaller amounts.",
  11: "This reward has already been paid.",
  12: "That reward token is not supported.",
  13: "The reward amount does not match the milestone.",
  14: "The quest must be archived before this can happen.",
  15: "The refund window is not open yet.",
  16: "The quest deadline has not passed yet.",
  17: "Too many rewards claimed in one batch.",
  18: "That address is no longer enrolled in the quest.",
  19: "Reward totals are inconsistent. Please contact support.",
  99: "The rewards contract is already initialized.",
  100: "The rewards contract is not initialized.",
  400: CONTRACT_PAUSED_MESSAGE,
} as const satisfies Record<RewardsErrorCode, string>

// ─── Certificate contract ────────────────────────────────────────────────────

/** Discriminants from `contracts/certificate/src/lib.rs` `pub enum Error`. */
export const CERTIFICATE_ERROR_CODES = {
  NotFound: 1,
  Unauthorized: 2,
  InvalidInput: 3,
  InvalidQuest: 5,
  AlreadyRevoked: 6,
  MetadataBaseNotSet: 7,
  MilestoneContractNotSet: 8,
  NotCompleted: 9,
  NotOwner: 10,
  AlreadyIssued: 20,
  Paused: CONTRACT_PAUSED_CODE,
} as const
export type CertificateErrorCode =
  (typeof CERTIFICATE_ERROR_CODES)[keyof typeof CERTIFICATE_ERROR_CODES]

export const CERTIFICATE_CONTRACT_ERRORS = {
  1: "Certificate not found.",
  2: "You are not authorized to do that.",
  3: "Invalid certificate details.",
  5: "That quest cannot be certified.",
  6: "This certificate has already been revoked.",
  7: "The certificate metadata base is not set.",
  8: "The certificate contract is not configured.",
  9: "The quest has not been completed yet.",
  10: "Only the certificate administrator can do that.",
  20: "A certificate has already been issued for this quest.",
  400: CONTRACT_PAUSED_MESSAGE,
} as const satisfies Record<CertificateErrorCode, string>

// ─── Completion contract ─────────────────────────────────────────────────────

/** Discriminants from `contracts/completion/src/lib.rs` `pub enum Error`. */
export const COMPLETION_ERROR_CODES = {
  NotInitialized: 1,
  NotOwner: 2,
  MilestonesIncomplete: 3,
  AlreadyCompleted: 4,
  CertificateError: 5,
  AlreadyInitialized: 6,
} as const
export type CompletionErrorCode =
  (typeof COMPLETION_ERROR_CODES)[keyof typeof COMPLETION_ERROR_CODES]

export const COMPLETION_CONTRACT_ERRORS = {
  1: "The completion contract is not configured.",
  2: "Only the quest owner can do that.",
  3: "Complete every milestone before finishing the quest.",
  4: "This quest is already completed.",
  5: "The completion certificate could not be issued.",
  6: "The completion contract is already initialized.",
} as const satisfies Record<CompletionErrorCode, string>

/**
 * The reward token is a Stellar Asset Contract, not a Lernza contract, so it
 * has no `Error` enum of its own. Its failures surface as SAC/SDK errors, which
 * `mapContractError` leaves untouched — the empty table exists so a token
 * scope is explicit rather than an unhandled branch.
 */
export const TOKEN_CONTRACT_ERRORS: Record<number, string> = {}

const CONTRACT_ERROR_MAPS: Record<ContractErrorScope, Record<number, string>> = {
  quest: QUEST_CONTRACT_ERRORS,
  milestone: MILESTONE_ERRORS,
  rewards: REWARDS_CONTRACT_ERRORS,
  certificate: CERTIFICATE_CONTRACT_ERRORS,
  completion: COMPLETION_CONTRACT_ERRORS,
  token: TOKEN_CONTRACT_ERRORS,
}

/**
 * Common Stellar/Soroban transaction-level error patterns and their
 * user-friendly messages. These are not contract Error codes but rather
 * SDK-level or RPC-level failures that users encounter during signing/submission.
 */
export const TRANSACTION_ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /user\s+(rejected|denied|cancelled)/i,
    message: "Transaction was cancelled by the user.",
  },
  {
    pattern: /insufficient.*fund/i,
    message: "Insufficient funds. Add XLM to your account and try again.",
  },
  {
    pattern: /network\s+mismatch/i,
    message: "Freighter is on the wrong network. Switch back in Freighter.",
  },
  {
    pattern: /signing\s+failed/i,
    message: "Transaction signing failed. Make sure Freighter is unlocked.",
  },
  { pattern: /account\s+changed/i, message: "Account changed after signing. Please re-confirm." },
  {
    pattern: /timeout|timed?\s*out/i,
    message: "Request timed out. Check your connection and try again.",
  },
  {
    pattern: /duplicate/i,
    message: "Transaction was already submitted. Please wait a moment.",
  },
  {
    pattern: /try.?again.?later|network\s+is\s*busy/i,
    message: "Network is busy. Please try again shortly.",
  },
]

/**
 * Extracts the numeric code from an `Error(Contract, #N)` string.
 * Returns null if no match is found.
 */
export function parseContractErrorCode(message: string | undefined): number | null {
  if (!message) return null
  const match = message.match(/Error\(Contract,\s*#(\d+)\)/)
  return match ? Number(match[1]) : null
}

/**
 * Resolves a contract identifier to a scope.
 *
 * Accepts a scope name (`"quest"`) or a deployed contract address, so callers
 * holding the address from a transaction result can pass it straight through
 * to `mapContractError` without knowing which contract it is. Returns
 * `undefined` for empty, unknown, or unconfigured addresses.
 */
export function resolveContractErrorScope(target?: string | null): ContractErrorScope | undefined {
  if (!target) return undefined

  const normalized = target.trim().toLowerCase()
  const byName = ALL_SCOPES.find(scope => scope === normalized)
  if (byName) return byName

  const byAddress = Object.entries(contractAddresses).find(
    ([, address]) => address && address === target
  )
  return byAddress ? (byAddress[0] as ContractErrorScope) : undefined
}

/** The error table for a scope, or `undefined` for an unknown identifier. */
export function getContractErrorMap(scope?: string | null): Record<number, string> | undefined {
  const resolved = resolveContractErrorScope(scope)
  return resolved ? CONTRACT_ERROR_MAPS[resolved] : undefined
}

/**
 * Message shown when a code exists but every candidate contract disagrees on
 * what it means. Better an unhelpful-but-honest message than a confident wrong
 * one — a quest "not found" reported as "Reward pool not found." sends users
 * looking in the wrong place entirely.
 */
function ambiguousContractErrorMessage(code: number): string {
  return `The contract rejected this request (error code #${code}). Check your details and try again.`
}

/**
 * Maps a raw contract error message to a human-readable string.
 *
 * `scope` is the contract the call was made against — a scope name or a
 * contract address. Supplying it is strongly preferred: without it a code is
 * only translated when every contract that defines it agrees on the wording,
 * and is otherwise reported verbatim.
 *
 * Falls back to the original message if no mapping is found.
 */
export function mapContractError(message: string, scope?: string | null): string {
  const code = parseContractErrorCode(message)
  if (code === null) return message

  const scoped = getContractErrorMap(scope)
  if (scoped) {
    const mapped = scoped[code]
    return mapped ?? message
  }

  // Unscoped: only translate when the code is unambiguous across contracts.
  const candidates = ALL_SCOPES.map(knownScope => CONTRACT_ERROR_MAPS[knownScope][code]).filter(
    (candidate): candidate is string => candidate !== undefined
  )

  if (candidates.length === 0) return message
  const first = candidates[0]
  if (candidates.every(candidate => candidate === first)) return first
  return ambiguousContractErrorMessage(code)
}

/**
 * Classifies an error string into one of the known error categories.
 */
export type ErrorKind = "wallet" | "network" | "contract" | "not_found" | "unknown"

export function classifyError(message: string): ErrorKind {
  const lower = message.toLowerCase()
  if (
    lower.includes("connect wallet") ||
    lower.includes("not connected") ||
    lower.includes("wallet required")
  )
    return "wallet"
  if (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("could not detect network") ||
    lower.includes("rpc") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("econnrefused") ||
    lower.includes("networkerror")
  )
    return "network"
  if (
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("quest not found")
  )
    return "not_found"
  if (
    lower.includes("error(contract") ||
    lower.includes("contract error") ||
    lower.includes("hoststatus") ||
    lower.includes("hostfunction") ||
    lower.includes("contract call failed")
  )
    return "contract"
  return "unknown"
}
