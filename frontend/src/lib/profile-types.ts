/**
 * Learner Profile Metadata Types (Issue #1501)
 *
 * Defines the data structures for learner profile metadata, achievement
 * showcase, and privacy controls. All profile data is stored off-chain in
 * localStorage and can be exported/imported via the backup system.
 */

// ─── Privacy Levels ────────────────────────────────────────────────────────────

/**
 * Privacy level for individual profile fields and showcase sections.
 * - Public: Visible to anyone viewing the profile
 * - Connections: Visible only to verified connections (future feature)
 * - Private: Visible only to the profile owner
 */
export const PrivacyLevel = {
  Public: "public",
  Connections: "connections",
  Private: "private",
} as const
export type PrivacyLevel = (typeof PrivacyLevel)[keyof typeof PrivacyLevel]

// ─── Field Limits (validation constants ─────────────────────────────────────────────────

export const PROFILE_FIELD_LIMITS = {
  DISPLAY_NAME_MAX: 50,
  DISPLAY_NAME_MIN: 2,
  BIO_MAX: 280,
  LOCATION_MAX: 100,
  WEBSITE_URL_MAX: 2048,
  LINK_LABEL_MAX: 30,
  MAX_LINKS: 5,
  TAG_MAX: 20,
  MAX_TAGS: 10,
  SHOWCASE_TITLE_MAX: 60,
  SHOWCASE_DESCRIPTION_MAX: 200,
} as const

// ─── Profile Metadata ───────────────────────────────────────────────────────────

export interface ProfileSocialLink {
  id: string
  label: string
  url: string
  privacy: PrivacyLevel
}

export interface ProfileMetadata {
  displayName: string
  bio: string
  location: string
  avatarUrl: string
  tags: string[]
  links: ProfileSocialLink[]
}

export interface ProfileFieldPrivacy {
  displayName: PrivacyLevel
  bio: PrivacyLevel
  location: PrivacyLevel
  avatarUrl: PrivacyLevel
  tags: PrivacyLevel
  links: PrivacyLevel
}

// ─── Achievement Showcase ────────────────────────────────────────────────────────

export interface CompletedQuestShowcase {
  questId: number
  questName: string
  description: string
  completionDate: number
  milestoneCount: number
  completedMilestones: number
  totalRewardsEarned: bigint
  highlighted: boolean
  privacy: PrivacyLevel
  reflection?: string
}

export interface RewardShowcase {
  id: string
  questId: number
  questName: string
  milestoneId: number
  milestoneTitle: string
  amount: bigint
  earnedAt: number
  txHash?: string
  privacy: PrivacyLevel
}

export interface ShowcaseSettings {
  showCompletedQuests: boolean
  showRewards: boolean
  questsPrivacy: PrivacyLevel
  rewardsPrivacy: PrivacyLevel
  featuredQuestIds: number[]
}

// ─── Full Profile State ───────────────────────────────────────────────────────

export interface LearnerProfile {
  version: string
  walletAddress: string
  metadata: ProfileMetadata
  fieldPrivacy: ProfileFieldPrivacy
  showcaseSettings: ShowcaseSettings
  showcasedQuests: CompletedQuestShowcase[]
  showcasedRewards: RewardShowcase[]
  updatedAt: number
  createdAt: number
}

// ─── Public View Filtering ────────────────────────────────────────────────────

export interface PublicLearnerProfile {
  walletAddress: string
  metadata: Partial<ProfileMetadata>
  showcasedQuests: CompletedQuestShowcase[]
  showcasedRewards: RewardShowcase[]
  showcaseSettings: ShowcaseSettings
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_FIELD_PRIVACY: ProfileFieldPrivacy = {
  displayName: PrivacyLevel.Public,
  bio: PrivacyLevel.Public,
  location: PrivacyLevel.Connections,
  avatarUrl: PrivacyLevel.Public,
  tags: PrivacyLevel.Public,
  links: PrivacyLevel.Connections,
}

export const DEFAULT_SHOWCASE_SETTINGS: ShowcaseSettings = {
  showCompletedQuests: true,
  showRewards: true,
  questsPrivacy: PrivacyLevel.Public,
  rewardsPrivacy: PrivacyLevel.Public,
  featuredQuestIds: [],
}

export function createEmptyProfile(walletAddress: string): LearnerProfile {
  const now = Date.now()
  return {
    version: "1.0.0",
    walletAddress,
    metadata: {
      displayName: "",
      bio: "",
      location: "",
      avatarUrl: "",
      tags: [],
      links: [],
    },
    fieldPrivacy: { ...DEFAULT_FIELD_PRIVACY },
    showcaseSettings: { ...DEFAULT_SHOWCASE_SETTINGS },
    showcasedQuests: [],
    showcasedRewards: [],
    updatedAt: now,
    createdAt: now,
  }
}
