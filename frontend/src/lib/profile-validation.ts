/**
 * Profile Data Validation (Issue #1501)
 *
 * Validation utilities for profile metadata. All validation rules are documented
 * below and enforced both on input and when saving to storage.
 *
 * ─── VALIDATION RULES DOCUMENTATION ───────────────────────────────────────────
 *
 * Display Name:
 *   - Required for public profiles
 *   - Length: 2-50 characters
 *   - Cannot be only whitespace
 *   - Cannot contain control characters or newlines
 *   - Allowed: Letters, numbers, spaces, hyphens, underscores, periods, apostrophes
 *
 * Bio:
 *   - Optional
 *   - Max: 280 characters (Twitter-length for scannable profiles)
 *   - Cannot contain control characters
 *   - Newlines allowed (max 5 line breaks for readability)
 *
 * Location:
 *   - Optional
 *   - Max: 100 characters
 *   - No control characters allowed
 *
 * Avatar URL:
 *   - Optional
 *   - Must be valid http/https URL if provided
 *   - Max: 2048 characters (standard URL limit)
 *   - IPFS URLs (ipfs://) also accepted
 *
 * Tags:
 *   - Max 10 tags per profile
 *   - Each tag: 2-20 characters
 *   - Lowercase alphanumeric and hyphens only
 *   - No duplicate tags
 *
 * Social Links:
 *   - Max 5 links per profile
 *   - Label: 1-30 characters
 *   - URL: Must be valid http/https or mailto: URL
 *   - URL Max: 2048 characters
 *   - No duplicate URLs
 *
 * Privacy Settings:
 *   - Each field must have a valid PrivacyLevel value
 *   - displayName defaults to Public (required for identification)
 *   - Fields marked Private are never exposed in public views
 *
 * Quest Showcase:
 *   - questId must be a positive integer
 *   - questName: 1-100 characters
 *   - completionDate must be a valid timestamp (not in future by > 1 day)
 *   - milestoneCount >= completedMilestones >= 0
 *   - totalRewardsEarned >= 0
 *   - reflection (if provided): max 500 characters
 *
 * Reward Showcase:
 *   - id must be unique non-empty string
 *   - amount >= 0
 *   - earnedAt must be valid timestamp
 *   - questId, milestoneId must be positive integers
 *
 * ────────────────────────────────────────────────────────────────────────────────
 */
import {
  PROFILE_FIELD_LIMITS,
  type ProfileMetadata,
  type ProfileSocialLink,
  type CompletedQuestShowcase,
  type RewardShowcase,
  type LearnerProfile,
  PrivacyLevel,
} from "@/lib/profile-types"

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

const VALID_PRIVACY_LEVELS = new Set(Object.values(PrivacyLevel))
const URL_REGEX = /^(https?:\/\/|ipfs:\/\/|mailto:)/i
const HTTP_URL_REGEX = /^https?:\/\//i
const DISPLAY_NAME_REGEX = /^[\p{L}\p{N}\s\-_.'']+$/u
const TAG_REGEX = /^[a-z0-9-]+$/
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/
const EMAIL_REGEX = /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/

function hasControlChars(str: string): boolean {
  return CONTROL_CHARS_REGEX.test(str)
}

function countLineBreaks(str: string): number {
  return (str.match(/\n/g) || []).length
}

export function validateDisplayName(name: string, isRequired = false): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const trimmed = name.trim()

  if (isRequired && trimmed.length === 0) {
    errors.push({
      field: "displayName",
      message: "Display name is required for public profiles",
      code: "DISPLAY_NAME_REQUIRED",
    })
  }

  if (trimmed.length > 0) {
    if (trimmed.length < PROFILE_FIELD_LIMITS.DISPLAY_NAME_MIN) {
      errors.push({
        field: "displayName",
        message: `Display name must be at least ${PROFILE_FIELD_LIMITS.DISPLAY_NAME_MIN} characters`,
        code: "DISPLAY_NAME_TOO_SHORT",
      })
    }

    if (trimmed.length > PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX) {
      errors.push({
        field: "displayName",
        message: `Display name cannot exceed ${PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX} characters`,
        code: "DISPLAY_NAME_TOO_LONG",
      })
    }

    if (hasControlChars(name)) {
      errors.push({
        field: "displayName",
        message: "Display name cannot contain control characters",
        code: "DISPLAY_NAME_INVALID_CHARS",
      })
    }

    if (name.includes("\n") || name.includes("\r")) {
      errors.push({
        field: "displayName",
        message: "Display name cannot contain newlines",
        code: "DISPLAY_NAME_NO_NEWLINES",
      })
    }

    if (!DISPLAY_NAME_REGEX.test(trimmed)) {
      warnings.push({
        field: "displayName",
        message: "Display name contains unusual characters",
        code: "DISPLAY_NAME_UNUSUAL_CHARS",
      })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateBio(bio: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (bio.length > PROFILE_FIELD_LIMITS.BIO_MAX) {
    errors.push({
      field: "bio",
      message: `Bio cannot exceed ${PROFILE_FIELD_LIMITS.BIO_MAX} characters`,
      code: "BIO_TOO_LONG",
    })
  }

  if (hasControlChars(bio.replace(/\n/g, ""))) {
    errors.push({
      field: "bio",
      message: "Bio cannot contain control characters",
      code: "BIO_INVALID_CHARS",
    })
  }

  if (countLineBreaks(bio) > 5) {
    warnings.push({
      field: "bio",
      message: "Bio has more than 5 line breaks - consider a more concise format",
      code: "BIO_TOO_MANY_LINES",
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateLocation(location: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (location.length > PROFILE_FIELD_LIMITS.LOCATION_MAX) {
    errors.push({
      field: "location",
      message: `Location cannot exceed ${PROFILE_FIELD_LIMITS.LOCATION_MAX} characters`,
      code: "LOCATION_TOO_LONG",
    })
  }

  if (hasControlChars(location)) {
    errors.push({
      field: "location",
      message: "Location cannot contain control characters",
      code: "LOCATION_INVALID_CHARS",
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateAvatarUrl(url: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const trimmed = url.trim()

  if (trimmed.length === 0) {
    return { valid: true, errors: [], warnings: [] }
  }

  if (trimmed.length > PROFILE_FIELD_LIMITS.WEBSITE_URL_MAX) {
    errors.push({
      field: "avatarUrl",
      message: `Avatar URL cannot exceed ${PROFILE_FIELD_LIMITS.WEBSITE_URL_MAX} characters`,
      code: "AVATAR_URL_TOO_LONG",
    })
  }

  if (!URL_REGEX.test(trimmed)) {
    errors.push({
      field: "avatarUrl",
      message: "Avatar URL must be http://, https://, or ipfs://",
      code: "AVATAR_URL_INVALID",
    })
  }

  if (!HTTP_URL_REGEX.test(trimmed) && !trimmed.startsWith("ipfs://")) {
    warnings.push({
      field: "avatarUrl",
      message: "For best compatibility, use https:// URLs for avatars",
      code: "AVATAR_URL_NON_HTTP",
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateTags(tags: string[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (tags.length > PROFILE_FIELD_LIMITS.MAX_TAGS) {
    errors.push({
      field: "tags",
      message: `Cannot have more than ${PROFILE_FIELD_LIMITS.MAX_TAGS} tags`,
      code: "TAGS_TOO_MANY",
    })
  }

  const seen = new Set<string>()
  tags.forEach((tag, index) => {
    const trimmed = tag.trim()

    if (trimmed.length < 2) {
      errors.push({
        field: `tags[${index}]`,
        message: `Tag "${tag}" must be at least 2 characters`,
        code: "TAG_TOO_SHORT",
      })
    }

    if (trimmed.length > PROFILE_FIELD_LIMITS.TAG_MAX) {
      errors.push({
        field: `tags[${index}]`,
        message: `Tag cannot exceed ${PROFILE_FIELD_LIMITS.TAG_MAX} characters`,
        code: "TAG_TOO_LONG",
      })
    }

    if (!TAG_REGEX.test(trimmed)) {
      errors.push({
        field: `tags[${index}]`,
        message: `Tag "${tag}" must contain only lowercase letters, numbers, and hyphens`,
        code: "TAG_INVALID_FORMAT",
      })
    }

    const lower = trimmed.toLowerCase()
    if (seen.has(lower)) {
      errors.push({
        field: `tags[${index}]`,
        message: `Duplicate tag: "${tag}"`,
        code: "TAG_DUPLICATE",
      })
    }
    seen.add(trimmed)
  })

  return { valid: errors.length === 0, errors, warnings }
}

export function validateSocialLink(link: ProfileSocialLink, index: number): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const trimmedLabel = link.label.trim()
  const trimmedUrl = link.url.trim()

  if (trimmedLabel.length === 0) {
    errors.push({
      field: `links[${index}].label`,
      message: "Link label is required",
      code: "LINK_LABEL_REQUIRED",
    })
  } else if (trimmedLabel.length > PROFILE_FIELD_LIMITS.LINK_LABEL_MAX) {
    errors.push({
      field: `links[${index}].label`,
      message: `Link label cannot exceed ${PROFILE_FIELD_LIMITS.LINK_LABEL_MAX} characters`,
      code: "LINK_LABEL_TOO_LONG",
    })
  }

  if (trimmedUrl.length === 0) {
    errors.push({
      field: `links[${index}].url`,
      message: "Link URL is required",
      code: "LINK_URL_REQUIRED",
    })
  } else {
    if (trimmedUrl.length > PROFILE_FIELD_LIMITS.WEBSITE_URL_MAX) {
      errors.push({
        field: `links[${index}].url`,
        message: `Link URL cannot exceed ${PROFILE_FIELD_LIMITS.WEBSITE_URL_MAX} characters`,
        code: "LINK_URL_TOO_LONG",
      })
    }

    const isHttp = HTTP_URL_REGEX.test(trimmedUrl)
    const isMailto = EMAIL_REGEX.test(trimmedUrl)
    if (!isHttp && !isMailto) {
      errors.push({
        field: `links[${index}].url`,
        message: "Link URL must be http://, https://, or mailto:",
        code: "LINK_URL_INVALID",
      })
    }
  }

  if (!VALID_PRIVACY_LEVELS.has(link.privacy)) {
    errors.push({
      field: `links[${index}].privacy`,
      message: "Invalid privacy level",
      code: "LINK_PRIVACY_INVALID",
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateSocialLinks(links: ProfileSocialLink[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (links.length > PROFILE_FIELD_LIMITS.MAX_LINKS) {
    errors.push({
      field: "links",
      message: `Cannot have more than ${PROFILE_FIELD_LIMITS.MAX_LINKS} social links`,
      code: "LINKS_TOO_MANY",
    })
  }

  const seenUrls = new Set<string>()
  links.forEach((link, index) => {
    const linkResult = validateSocialLink(link, index)
    errors.push(...linkResult.errors)
    warnings.push(...linkResult.warnings)

    const trimmedUrl = link.url.trim().toLowerCase()
    if (trimmedUrl && seenUrls.has(trimmedUrl)) {
      errors.push({
        field: `links[${index}].url`,
        message: `Duplicate URL: "${link.url}"`,
        code: "LINK_URL_DUPLICATE",
      })
    }
    seenUrls.add(trimmedUrl)
  })

  return { valid: errors.length === 0, errors, warnings }
}

export function validateCompletedQuestShowcase(
  quest: CompletedQuestShowcase,
  index: number
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const field = (f: string) => `showcasedQuests[${index}].${f}`

  if (!Number.isInteger(quest.questId) || quest.questId < 0) {
    errors.push({
      field: field("questId"),
      message: "questId must be a non-negative integer",
      code: "QUEST_ID_INVALID",
    })
  }

  if (!quest.questName || quest.questName.trim().length === 0) {
    errors.push({
      field: field("questName"),
      message: "Quest name is required",
      code: "QUEST_NAME_REQUIRED",
    })
  } else if (quest.questName.length > 100) {
    errors.push({
      field: field("questName"),
      message: "Quest name cannot exceed 100 characters",
      code: "QUEST_NAME_TOO_LONG",
    })
  }

  if (quest.completionDate <= 0) {
    errors.push({
      field: field("completionDate"),
      message: "Invalid completion date",
      code: "QUEST_COMPLETION_DATE_INVALID",
    })
  } else {
    const oneDayAhead = Date.now() + 24 * 60 * 60 * 1000
    if (quest.completionDate > oneDayAhead) {
      warnings.push({
        field: field("completionDate"),
        message: "Completion date is set in the future",
        code: "QUEST_COMPLETION_DATE_FUTURE",
      })
    }
  }

  if (!Number.isInteger(quest.milestoneCount) || quest.milestoneCount < 0) {
    errors.push({
      field: field("milestoneCount"),
      message: "milestoneCount must be a non-negative integer",
      code: "MILESTONE_COUNT_INVALID",
    })
  }

  if (!Number.isInteger(quest.completedMilestones) || quest.completedMilestones < 0) {
    errors.push({
      field: field("completedMilestones"),
      message: "completedMilestones must be a non-negative integer",
      code: "COMPLETED_MILESTONES_INVALID",
    })
  }

  if (quest.completedMilestones > quest.milestoneCount) {
    errors.push({
      field: field("completedMilestones"),
      message: "completedMilestones cannot exceed milestoneCount",
      code: "COMPLETED_MILESTONES_EXCEED_TOTAL",
    })
  }

  if (quest.totalRewardsEarned < 0n) {
    errors.push({
      field: field("totalRewardsEarned"),
      message: "Rewards earned cannot be negative",
      code: "REWARDS_NEGATIVE",
    })
  }

  if (quest.reflection !== undefined && quest.reflection.length > 500) {
    errors.push({
      field: field("reflection"),
      message: "Reflection cannot exceed 500 characters",
      code: "REFLECTION_TOO_LONG",
    })
  }

  if (!VALID_PRIVACY_LEVELS.has(quest.privacy)) {
    errors.push({
      field: field("privacy"),
      message: "Invalid privacy level",
      code: "QUEST_PRIVACY_INVALID",
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateRewardShowcase(reward: RewardShowcase, index: number): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const field = (f: string) => `showcasedRewards[${index}].${f}`

  if (!reward.id || reward.id.trim().length === 0) {
    errors.push({
      field: field("id"),
      message: "Reward ID is required",
      code: "REWARD_ID_REQUIRED",
    })
  }

  if (!Number.isInteger(reward.questId) || reward.questId < 0) {
    errors.push({
      field: field("questId"),
      message: "questId must be a non-negative integer",
      code: "REWARD_QUEST_ID_INVALID",
    })
  }

  if (!Number.isInteger(reward.milestoneId) || reward.milestoneId < 0) {
    errors.push({
      field: field("milestoneId"),
      message: "milestoneId must be a non-negative integer",
      code: "REWARD_MILESTONE_ID_INVALID",
    })
  }

  if (!reward.milestoneTitle || reward.milestoneTitle.trim().length === 0) {
    warnings.push({
      field: field("milestoneTitle"),
      message: "Milestone title is missing",
      code: "REWARD_MILESTONE_TITLE_MISSING",
    })
  }

  if (reward.amount < 0n) {
    errors.push({
      field: field("amount"),
      message: "Reward amount cannot be negative",
      code: "REWARD_AMOUNT_NEGATIVE",
    })
  }

  if (reward.earnedAt <= 0) {
    errors.push({
      field: field("earnedAt"),
      message: "Invalid earned date",
      code: "REWARD_EARNED_AT_INVALID",
    })
  }

  if (!VALID_PRIVACY_LEVELS.has(reward.privacy)) {
    errors.push({
      field: field("privacy"),
      message: "Invalid privacy level",
      code: "REWARD_PRIVACY_INVALID",
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateProfileMetadata(metadata: ProfileMetadata): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const combine = (result: ValidationResult) => {
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }

  combine(validateDisplayName(metadata.displayName))
  combine(validateBio(metadata.bio))
  combine(validateLocation(metadata.location))
  combine(validateAvatarUrl(metadata.avatarUrl))
  combine(validateTags(metadata.tags))
  combine(validateSocialLinks(metadata.links))

  return { valid: errors.length === 0, errors, warnings }
}

export function validateFullProfile(profile: LearnerProfile): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const combine = (result: ValidationResult) => {
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }

  if (!profile.walletAddress || profile.walletAddress.trim().length === 0) {
    errors.push({
      field: "walletAddress",
      message: "Wallet address is required",
      code: "WALLET_ADDRESS_REQUIRED",
    })
  }

  if (!profile.version) {
    warnings.push({
      field: "version",
      message: "Profile version is missing",
      code: "PROFILE_VERSION_MISSING",
    })
  }

  combine(validateProfileMetadata(profile.metadata))

  profile.showcasedQuests.forEach((quest, index) => {
    combine(validateCompletedQuestShowcase(quest, index))
  })

  const seenQuestIds = new Set<number>()
  profile.showcasedQuests.forEach((quest, index) => {
    if (seenQuestIds.has(quest.questId)) {
      errors.push({
        field: `showcasedQuests[${index}].questId`,
        message: `Duplicate quest showcase: ID ${quest.questId}`,
        code: "SHOWCASE_QUEST_DUPLICATE",
      })
    }
    seenQuestIds.add(quest.questId)
  })

  profile.showcasedRewards.forEach((reward, index) => {
    combine(validateRewardShowcase(reward, index))
  })

  const seenRewardIds = new Set<string>()
  profile.showcasedRewards.forEach((reward, index) => {
    if (seenRewardIds.has(reward.id)) {
      errors.push({
        field: `showcasedRewards[${index}].id`,
        message: `Duplicate reward ID: ${reward.id}`,
        code: "SHOWCASE_REWARD_DUPLICATE",
      })
    }
    seenRewardIds.add(reward.id)
  })

  return { valid: errors.length === 0, errors, warnings }
}

export function sanitizeDisplayName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function sanitizeBio(bio: string): string {
  // eslint-disable-next-line no-control-regex
  let result = bio.replace(/[\x00-\x09\x0B\x1F\x7F]/g, "")
  result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  return result
}

export function sanitizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map(t =>
          t
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
        )
        .filter(t => t.length >= 2 && t.length <= PROFILE_FIELD_LIMITS.TAG_MAX)
    )
  )
}
