// ─── Contract limit constants (single source of truth for the frontend) ──────

export const MAX_QUEST_NAME_LEN = 64
export const MAX_QUEST_DESCRIPTION_LEN = 2000
export const MAX_MILESTONE_TITLE_LEN = 128
export const MAX_MILESTONE_DESCRIPTION_LEN = 1000
export const MAX_MILESTONES = 50

// ─── Quest Contract Types ────────────────────────────────────────────────────

/**
 * Visibility enum matching Rust contract definition.
 * Controls whether a quest appears in public discovery lists.
 */
export const Visibility = {
  Public: 0,
  Private: 1,
} as const
export type Visibility = (typeof Visibility)[keyof typeof Visibility]

/**
 * QuestStatus enum matching Rust contract definition.
 * Archived quests remain readable but do not accept new enrollments.
 */
export const QuestStatus = {
  Active: 0,
  Archived: 1,
} as const
export type QuestStatus = (typeof QuestStatus)[keyof typeof QuestStatus]

/**
 * QuestInfo interface matching Rust QuestInfo struct.
 * All field types align with contract XDR types:
 * - u32 -> number
 * - u64 -> number
 * - String -> string
 * - Address -> string
 * - Vec<String> -> string[]
 * - Option<u32> -> number | undefined
 */
export interface QuestInfo {
  id: number // u32
  owner: string // Address
  name: string // String
  description: string // String
  category: string // String
  tags: string[] // Vec<String>
  tokenAddr: string // Address (token_addr in Rust)
  createdAt: number // u64 (created_at in Rust)
  visibility: Visibility // Visibility enum
  status: QuestStatus // QuestStatus enum
  deadline: number // u64
  maxEnrollees?: number // Option<u32> (max_enrollees in Rust)
}

// ─── Legacy Types (to be migrated) ───────────────────────────────────────────

export interface WorkspaceInfo {
  id: number
  owner: string
  name: string
  description: string
  token_addr: string
  created_at: number
  visibility: Visibility
  max_enrollees?: number
}

export interface MilestoneInfo {
  id: number
  quest_id: number
  title: string
  description: string
  reward_amount: number
}
