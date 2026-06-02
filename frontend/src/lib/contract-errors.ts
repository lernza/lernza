/**
 * Centralized contract error code → human-readable message mapping.
 *
 * Codes come from the Soroban contract `Error` enum variants. When a
 * contract call reverts with `Error(Contract, #N)` the number N is the
 * variant index (1-based, matching the Rust enum declaration order).
 */

export const QUEST_CONTRACT_ERRORS: Record<number, string> = {
  1: "Quest not found.",
  2: "You are not the owner of this quest.",
  3: "Quest is archived and no longer accepting changes.",
  4: "You are already enrolled in this quest.",
  5: "This learner is not enrolled in this quest.",
  6: "Invalid quest parameters.",
  7: "This quest is already full.",
  8: "This quest is archived and no longer accepts new learners.",
  9: "Quest deadline has passed.",
  10: "Invalid visibility value.",
  11: "This quest is invite only.",
}

export const MILESTONE_CONTRACT_ERRORS: Record<number, string> = {
  1: "Milestone not found.",
  2: "You are not the owner of this quest.",
  3: "Invalid milestone parameters.",
  4: "Milestone already verified.",
  5: "Quest not found.",
  12: "This learner is not enrolled in the quest.",
  14: "Complete previous milestone first.",
}

export const REWARDS_CONTRACT_ERRORS: Record<number, string> = {
  1: "Reward pool not found.",
  2: "Insufficient balance in reward pool.",
  3: "You are not authorized to distribute this reward.",
  4: "Invalid reward amount.",
  5: "Quest not found.",
}

/**
 * Extracts the numeric code from an `Error(Contract, #N)` string.
 * Returns null if no match is found.
 */
export function parseContractErrorCode(message: string): number | null {
  const match = message.match(/Error\(Contract,\s*#(\d+)\)/)
  return match ? Number(match[1]) : null
}

/**
 * Maps a raw contract error message to a human-readable string.
 * Falls back to the original message if no mapping is found.
 */
export function mapContractError(
  message: string,
  lookup: Record<number, string> = {
    ...QUEST_CONTRACT_ERRORS,
    ...MILESTONE_CONTRACT_ERRORS,
    ...REWARDS_CONTRACT_ERRORS,
  }
): string {
  const code = parseContractErrorCode(message)
  if (code !== null && lookup[code]) return lookup[code]
  return message
}

/**
 * Classifies an error string into one of the known error categories.
 */
export type ErrorKind = "wallet" | "network" | "contract" | "not_found" | "unknown"

export function classifyError(message: string): ErrorKind {
  const lower = message.toLowerCase()
  if (lower.includes("connect wallet") || lower.includes("not connected")) return "wallet"
  if (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("could not detect network") ||
    lower.includes("rpc") ||
    lower.includes("timeout")
  )
    return "network"
  if (lower.includes("not found") || lower.includes("does not exist")) return "not_found"
  if (
    lower.includes("error(contract") ||
    lower.includes("contract error") ||
    lower.includes("hoststatus") ||
    lower.includes("hostfunction")
  )
    return "contract"
  return "unknown"
}
