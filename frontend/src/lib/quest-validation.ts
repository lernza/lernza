/**
 * Centralized quest ID validation and parsing.
 * Single source of truth for quest ID validation across the application.
 */

export type QuestValidationState =
  | { status: "valid"; questId: number }
  | { status: "invalid"; reason: "not_a_number" | "negative" }
  | { status: "missing" }
  | { status: "inaccessible"; reason: string }

/**
 * Validates and parses a quest ID from a route parameter.
 * Returns a structured state indicating validity and reason for any issues.
 */
export function validateQuestId(idParam: string | undefined): QuestValidationState {
  // Check if ID is missing
  if (idParam === undefined || idParam === null || idParam === "") {
    return { status: "missing" }
  }

  // Try to parse as number
  const parsed = Number(idParam)

  // Check if it's a valid number
  if (!Number.isFinite(parsed)) {
    return { status: "invalid", reason: "not_a_number" }
  }

  // Check if it's an integer
  if (!Number.isInteger(parsed)) {
    return { status: "invalid", reason: "not_a_number" }
  }

  // Check if it's negative
  if (parsed < 0) {
    return { status: "invalid", reason: "negative" }
  }

  return { status: "valid", questId: parsed }
}

/**
 * Type guard to check if validation state is valid
 */
export function isValidQuestId(
  state: QuestValidationState
): state is { status: "valid"; questId: number } {
  return state.status === "valid"
}
