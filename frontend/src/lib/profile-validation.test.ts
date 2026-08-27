import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  validateDisplayName,
  validateBio,
  validateLocation,
  validateAvatarUrl,
  validateTags,
  validateSocialLinks,
  validateProfileMetadata,
  validateCompletedQuestShowcase,
  validateRewardShowcase,
  validateFullProfile,
  sanitizeDisplayName,
  sanitizeBio,
  sanitizeTags,
} from "@/lib/profile-validation"
import {
  createEmptyProfile,
  PrivacyLevel as PL,
  PROFILE_FIELD_LIMITS,
  type CompletedQuestShowcase,
  type RewardShowcase,
  type LearnerProfile,
} from "@/lib/profile-types"
import {
  filterMetadataForViewer,
  getPublicProfile,
  hasProfileContent,
  loadProfile,
  saveProfile,
} from "@/lib/profile-store"

describe("Profile Validation", () => {
  describe("validateDisplayName", () => {
    it("passes for valid display names", () => {
      expect(validateDisplayName("Alex Carter").valid).toBe(true)
      expect(validateDisplayName("Jane Doe-Smith").valid).toBe(true)
      expect(validateDisplayName("O'Neil").valid).toBe(true)
      expect(validateDisplayName("Test_User123").valid).toBe(true)
    })

    it("requires min length when required", () => {
      const result = validateDisplayName("A", true)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "DISPLAY_NAME_TOO_SHORT")).toBe(true)
    })

    it("enforces max length", () => {
      const long = "A".repeat(PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX + 1)
      const result = validateDisplayName(long)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "DISPLAY_NAME_TOO_LONG")).toBe(true)
    })

    it("rejects newlines", () => {
      const result = validateDisplayName("Hello\nWorld")
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "DISPLAY_NAME_NO_NEWLINES")).toBe(true)
    })

    it("rejects control characters", () => {
      const result = validateDisplayName("Hello\x00World")
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "DISPLAY_NAME_INVALID_CHARS")).toBe(true)
    })
  })

  describe("validateBio", () => {
    it("allows empty bio", () => {
      expect(validateBio("").valid).toBe(true)
    })

    it("enforces max length", () => {
      const long = "A".repeat(PROFILE_FIELD_LIMITS.BIO_MAX + 1)
      const result = validateBio(long)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "BIO_TOO_LONG")).toBe(true)
    })

    it("allows newlines but warns on too many", () => {
      const ok = "Line1\nLine2\nLine3"
      expect(validateBio(ok).valid).toBe(true)
      expect(validateBio(ok).warnings.length).toBe(0)

      const manyLines = "L1\nL2\nL3\nL4\nL5\nL6\nL7"
      const result = validateBio(manyLines)
      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.code === "BIO_TOO_MANY_LINES")).toBe(true)
    })
  })

  describe("validateLocation", () => {
    it("passes for valid locations", () => {
      expect(validateLocation("Berlin, Germany").valid).toBe(true)
      expect(validateLocation("").valid).toBe(true)
    })

    it("enforces max length", () => {
      const long = "A".repeat(PROFILE_FIELD_LIMITS.LOCATION_MAX + 1)
      expect(validateLocation(long).valid).toBe(false)
    })
  })

  describe("validateAvatarUrl", () => {
    it("allows empty URL", () => {
      expect(validateAvatarUrl("").valid).toBe(true)
    })

    it("accepts https URLs", () => {
      expect(validateAvatarUrl("https://example.com/avatar.png").valid).toBe(true)
    })

    it("accepts http URLs", () => {
      expect(validateAvatarUrl("http://example.com/avatar.png").valid).toBe(true)
    })

    it("accepts ipfs URLs", () => {
      expect(validateAvatarUrl("ipfs://QmXYZ").valid).toBe(true)
    })

    it("rejects invalid protocols", () => {
      expect(validateAvatarUrl("ftp://bad.com/x.png").valid).toBe(false)
    })
  })

  describe("validateTags", () => {
    it("validates tag format", () => {
      expect(validateTags(["rust", "defi", "smart-contracts"]).valid).toBe(true)
      expect(validateTags(["Rust"]).errors[0]?.code === "TAG_INVALID_FORMAT").toBe(true)
      expect(validateTags(["ab"]).valid).toBe(true)
      expect(validateTags(["a"]).errors[0]?.code === "TAG_TOO_SHORT").toBe(true)
    })

    it("prevents duplicate tags", () => {
      const result = validateTags(["rust", "rust"])
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "TAG_DUPLICATE")).toBe(true)
    })

    it("enforces max tag count", () => {
      const many = Array.from({ length: PROFILE_FIELD_LIMITS.MAX_TAGS + 1 }, (_, i) => `tag${i}`)
      const result = validateTags(many)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "TAGS_TOO_MANY")).toBe(true)
    })
  })

  describe("validateSocialLinks", () => {
    it("validates link format", () => {
      const valid = [
        { id: "1", label: "GitHub", url: "https://github.com/user", privacy: PL.Public },
      ]
      expect(validateSocialLinks(valid).valid).toBe(true)
    })

    it("requires label and URL", () => {
      const missingLabel = [{ id: "1", label: "", url: "https://x.com", privacy: PL.Public }]
      expect(validateSocialLinks(missingLabel as any).errors.some(e => e.code === "LINK_LABEL_REQUIRED")).toBe(true)

      const missingUrl = [{ id: "1", label: "X", url: "", privacy: PL.Public }]
      expect(validateSocialLinks(missingUrl as any).errors.some(e => e.code === "LINK_URL_REQUIRED")).toBe(true)
    })

    it("rejects mailto URLs that aren't valid emails", () => {
      const badMailto = [{ id: "1", label: "Email", url: "mailto:notanemail", privacy: PL.Public }]
      expect(validateSocialLinks(badMailto as any).errors.some(e => e.code === "LINK_URL_INVALID")).toBe(true)
    })

    it("prevents duplicate URLs", () => {
      const links = [
        { id: "1", label: "GH1", url: "https://github.com/a", privacy: PL.Public },
        { id: "2", label: "GH2", url: "https://github.com/a", privacy: PL.Public },
      ]
      const result = validateSocialLinks(links)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "LINK_URL_DUPLICATE")).toBe(true)
    })
  })

  describe("validateCompletedQuestShowcase", () => {
    const baseQuest: CompletedQuestShowcase = {
      questId: 1,
      questName: "Rust Basics",
      description: "Learn Rust fundamentals",
      completionDate: Date.now(),
      milestoneCount: 5,
      completedMilestones: 5,
      totalRewardsEarned: 100_000_000n,
      highlighted: false,
      privacy: PL.Public,
    }

    it("passes for valid quest showcase", () => {
      const result = validateCompletedQuestShowcase(baseQuest, 0)
      expect(result.valid).toBe(true)
    })

    it("requires non-negative questId", () => {
      const result = validateCompletedQuestShowcase({ ...baseQuest, questId: -1 }, 0)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "QUEST_ID_INVALID")).toBe(true)
    })

    it("prevents completedMilestones > milestoneCount", () => {
      const result = validateCompletedQuestShowcase(
        { ...baseQuest, milestoneCount: 3, completedMilestones: 5 },
        0,
      )
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "COMPLETED_MILESTONES_EXCEED_TOTAL")).toBe(true)
    })

    it("validates reflection length", () => {
      const longReflection = "A".repeat(501)
      const result = validateCompletedQuestShowcase(
        { ...baseQuest, reflection: longReflection },
        0,
      )
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "REFLECTION_TOO_LONG")).toBe(true)
    })
  })

  describe("validateRewardShowcase", () => {
    const baseReward: RewardShowcase = {
      id: "r-1",
      questId: 1,
      questName: "Rust Basics",
      milestoneId: 2,
      milestoneTitle: "Variables & Types",
      amount: 50_000_000n,
      earnedAt: Date.now(),
      privacy: PL.Public,
    }

    it("passes for valid reward", () => {
      expect(validateRewardShowcase(baseReward, 0).valid).toBe(true)
    })

    it("requires non-empty id", () => {
      const result = validateRewardShowcase({ ...baseReward, id: "" }, 0)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "REWARD_ID_REQUIRED")).toBe(true)
    })

    it("prevents negative amounts", () => {
      const result = validateRewardShowcase({ ...baseReward, amount: -1n }, 0)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === "REWARD_AMOUNT_NEGATIVE")).toBe(true)
    })
  })

  describe("Sanitization", () => {
    it("sanitizes display names", () => {
      expect(sanitizeDisplayName("  Hello\x00World  ")).toBe("Hello World")
      expect(sanitizeDisplayName("Multi  Space   Name")).toBe("Multi Space Name")
    })

    it("sanitizes bios", () => {
      expect(sanitizeBio("Hello\r\nWorld\x00")).toBe("Hello\nWorld")
    })

    it("sanitizes tags", () => {
      const result = sanitizeTags([" Rust ", "DeFi!!", "rust", ""])
      expect(result).toEqual(["rust", "defi"])
    })
  })
})

describe("Profile Store - Privacy Filtering", () => {
  const baseProfile = createEmptyProfile("GTEST123")

  const profileWithData: LearnerProfile = {
    ...baseProfile,
    metadata: {
      displayName: "Public Name",
      bio: "Public bio about me",
      location: "Private Location",
      avatarUrl: "https://example.com/avatar.png",
      tags: ["rust", "defi"],
      links: [
        { id: "1", label: "GitHub", url: "https://github.com/u", privacy: PL.Public },
        { id: "2", label: "Private Email", url: "mailto:private@x.com", privacy: PL.Private },
      ],
    },
    fieldPrivacy: {
      displayName: PL.Public,
      bio: PL.Public,
      location: PL.Private,
      avatarUrl: PL.Public,
      tags: PL.Public,
      links: PL.Public,
    },
    showcasedQuests: [
      {
        questId: 1,
        questName: "Public Quest",
        description: "",
        completionDate: Date.now(),
        milestoneCount: 3,
        completedMilestones: 3,
        totalRewardsEarned: 100n,
        highlighted: false,
        privacy: PL.Public,
      },
      {
        questId: 2,
        questName: "Private Quest",
        description: "",
        completionDate: Date.now(),
        milestoneCount: 1,
        completedMilestones: 1,
        totalRewardsEarned: 50n,
        highlighted: false,
        privacy: PL.Private,
      },
    ],
    showcasedRewards: [
      {
        id: "r1",
        questId: 1,
        questName: "Public Quest",
        milestoneId: 1,
        milestoneTitle: "MS1",
        amount: 100n,
        earnedAt: Date.now(),
        privacy: PL.Public,
      },
      {
        id: "r2",
        questId: 2,
        questName: "Private Quest",
        milestoneId: 1,
        milestoneTitle: "MS2",
        amount: 50n,
        earnedAt: Date.now(),
        privacy: PL.Private,
      },
    ],
  }

  describe("filterMetadataForViewer", () => {
    it("owner sees all fields", () => {
      const filtered = filterMetadataForViewer(
        profileWithData.metadata,
        profileWithData.fieldPrivacy,
        true,
      )
      expect(filtered.displayName).toBe("Public Name")
      expect(filtered.location).toBe("Private Location")
      expect(filtered.links?.length).toBe(2)
    })

    it("public viewer only sees public fields", () => {
      const filtered = filterMetadataForViewer(
        profileWithData.metadata,
        profileWithData.fieldPrivacy,
        false,
      )
      expect(filtered.displayName).toBe("Public Name")
      expect(filtered.bio).toBe("Public bio about me")
      expect(filtered.location).toBeUndefined()
      expect(filtered.links?.length).toBe(1)
      expect(filtered.links?.[0].label).toBe("GitHub")
    })
  })

  describe("getPublicProfile", () => {
    it("never exposes private quests or rewards", () => {
      const pub = getPublicProfile(profileWithData)
      expect(pub.showcasedQuests.map(q => q.questId)).toEqual([1])
      expect(pub.showcasedRewards.map(r => r.id)).toEqual(["r1"])
      expect(pub.metadata.location).toBeUndefined()
    })
  })

  describe("hasProfileContent", () => {
    it("detects empty profiles", () => {
      expect(hasProfileContent(baseProfile)).toBe(false)
    })

    it("detects profiles with content", () => {
      expect(hasProfileContent(profileWithData)).toBe(true)
    })

    it("detects single field content", () => {
      const onlyName = createEmptyProfile("GX")
      onlyName.metadata.displayName = "Someone"
      expect(hasProfileContent(onlyName)).toBe(true)
    })
  })
})

describe("Full Profile Validation", () => {
  it("detects duplicate quest showcases", () => {
    const profile = createEmptyProfile("GTEST")
    profile.showcasedQuests = [
      {
        questId: 1, questName: "A", description: "", completionDate: Date.now(),
        milestoneCount: 1, completedMilestones: 1, totalRewardsEarned: 0n,
        highlighted: false, privacy: PL.Public,
      },
      {
        questId: 1, questName: "A", description: "", completionDate: Date.now(),
        milestoneCount: 1, completedMilestones: 1, totalRewardsEarned: 0n,
        highlighted: false, privacy: PL.Public,
      },
    ]
    const result = validateFullProfile(profile)
    expect(result.errors.some(e => e.code === "SHOWCASE_QUEST_DUPLICATE")).toBe(true)
  })

  it("detects duplicate reward IDs", () => {
    const profile = createEmptyProfile("GTEST")
    profile.showcasedRewards = [
      { id: "dup", questId: 1, questName: "Q", milestoneId: 1, milestoneTitle: "M", amount: 1n, earnedAt: Date.now(), privacy: PL.Public },
      { id: "dup", questId: 2, questName: "Q2", milestoneId: 2, milestoneTitle: "M2", amount: 2n, earnedAt: Date.now(), privacy: PL.Public },
    ]
    const result = validateFullProfile(profile)
    expect(result.errors.some(e => e.code === "SHOWCASE_REWARD_DUPLICATE")).toBe(true)
  })
})
