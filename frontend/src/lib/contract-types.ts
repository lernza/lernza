// ─── Contract limit constants (single source of truth for the frontend) ──────

export const MAX_QUEST_NAME_LEN = 64
export const MAX_QUEST_DESCRIPTION_LEN = 2000
export const MAX_MILESTONE_TITLE_LEN = 128
export const MAX_MILESTONE_DESCRIPTION_LEN = 1000
export const MAX_MILESTONES = 50

export const Visibility = {
  Public: 0,
  Private: 1,
} as const
export type Visibility = (typeof Visibility)[keyof typeof Visibility]

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
