export const Visibility = {
  Public: 0,
  Private: 1,
} as const;
export type Visibility = typeof Visibility[keyof typeof Visibility];

export interface WorkspaceInfo {
  id: number
  owner: string
  name: string
  description: string
  token_addr: string
  created_at: number
  visibility: Visibility
}

export interface MilestoneInfo {
  id: number
  quest_id: number
  title: string
  description: string
  reward_amount: number
}
