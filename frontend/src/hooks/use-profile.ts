/**
 * React Hook for Learner Profile Management (Issue #1501)
 *
 * Provides reactive access to profile state, metadata editing, showcase
 * management, and privacy controls.
 */
import { useEffect, useMemo, useState, useCallback } from "react"
import { useWallet } from "@/hooks/use-wallet"
import {
  type LearnerProfile,
  type ProfileMetadata,
  type ProfileFieldPrivacy,
  type CompletedQuestShowcase,
  type RewardShowcase,
  type PrivacyLevel,
} from "@/lib/profile-types"
import {
  getProfileStore,
  initializeProfileStore,
  updateProfileMetadata,
  updateFieldPrivacy,
  updateShowcaseSettings,
  upsertShowcasedQuest,
  removeShowcasedQuest,
  upsertShowcasedReward,
  removeShowcasedReward,
  loadProfile,
  filterMetadataForViewer,
  hasProfileContent,
  type ProfileStoreState,
} from "@/lib/profile-store"
import {
  validateProfileMetadata,
  sanitizeDisplayName,
  sanitizeBio,
  sanitizeTags,
} from "@/lib/profile-validation"

export interface UseProfileReturn {
  profile: LearnerProfile | null
  isLoading: boolean
  error: string | null
  viewerIsOwner: boolean

  hasContent: boolean

  filteredMetadata: Partial<ProfileMetadata>
  filteredShowcasedQuests: CompletedQuestShowcase[]
  filteredShowcasedRewards: RewardShowcase[]

  setMetadata: (updates: Partial<ProfileMetadata>) => boolean
  setFieldPrivacy: (updates: Partial<ProfileFieldPrivacy>) => boolean
  setShowcaseSettings: (updates: Partial<LearnerProfile["showcaseSettings"]>) => boolean

  addOrUpdateShowcasedQuest: (quest: CompletedQuestShowcase) => boolean
  deleteShowcasedQuest: (questId: number) => boolean
  setQuestPrivacy: (questId: number, privacy: PrivacyLevel) => boolean
  toggleQuestHighlighted: (questId: number) => boolean

  addOrUpdateShowcasedReward: (reward: RewardShowcase) => boolean
  deleteShowcasedReward: (rewardId: string) => boolean
  setRewardPrivacy: (rewardId: string, privacy: PrivacyLevel) => boolean

  refreshProfile: () => void
  validateCurrent: () => ReturnType<typeof validateProfileMetadata>
}

export function useProfile(viewerIsOwner = true): UseProfileReturn {
  const { address, connected } = useWallet()
  const [storeState, setStoreState] = useState<ProfileStoreState>(getProfileStore().getState())

  useEffect(() => {
    const store = getProfileStore()
    const unsubscribe = store.subscribe(state => {
      setStoreState({ ...state })
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (connected && address) {
      initializeProfileStore(address, viewerIsOwner)
    }
  }, [connected, address, viewerIsOwner])

  const profile = storeState.profile
  const isLoading = storeState.isLoading
  const error = storeState.error
  const effectiveViewerIsOwner = storeState.viewerIsOwner

  const hasContent = useMemo(() => {
    return profile ? hasProfileContent(profile) : false
  }, [profile])

  const filteredMetadata = useMemo(() => {
    if (!profile) return {}
    return filterMetadataForViewer(profile.metadata, profile.fieldPrivacy, effectiveViewerIsOwner)
  }, [profile, effectiveViewerIsOwner])

  const filteredShowcasedQuests = useMemo(() => {
    if (!profile) return []
    if (!profile.showcaseSettings.showCompletedQuests) return []
    if (effectiveViewerIsOwner) return profile.showcasedQuests
    return profile.showcasedQuests.filter(q => q.privacy === "public")
  }, [profile, effectiveViewerIsOwner])

  const filteredShowcasedRewards = useMemo(() => {
    if (!profile) return []
    if (!profile.showcaseSettings.showRewards) return []
    if (effectiveViewerIsOwner) return profile.showcasedRewards
    return profile.showcasedRewards.filter(r => r.privacy === "public")
  }, [profile, effectiveViewerIsOwner])

  const setMetadata = useCallback(
    (updates: Partial<ProfileMetadata>): boolean => {
      if (!address) return false

      const sanitized: Partial<ProfileMetadata> = {}
      if (updates.displayName !== undefined) {
        sanitized.displayName = sanitizeDisplayName(updates.displayName)
      }
      if (updates.bio !== undefined) {
        sanitized.bio = sanitizeBio(updates.bio)
      }
      if (updates.tags !== undefined) {
        sanitized.tags = sanitizeTags(updates.tags)
      }

      const current = profile ?? loadProfile(address)
      const merged: ProfileMetadata = { ...current.metadata, ...sanitized }
      const validation = validateProfileMetadata(merged)
      if (!validation.valid) {
        console.error("Profile metadata validation failed:", validation.errors)
        return false
      }

      return updateProfileMetadata(address, sanitized) !== null
    },
    [address, profile]
  )

  const setFieldPrivacy = useCallback(
    (updates: Partial<ProfileFieldPrivacy>): boolean => {
      if (!address) return false
      return updateFieldPrivacy(address, updates) !== null
    },
    [address]
  )

  const setShowcaseSettings = useCallback(
    (updates: Partial<LearnerProfile["showcaseSettings"]>): boolean => {
      if (!address) return false
      return updateShowcaseSettings(address, updates) !== null
    },
    [address]
  )

  const addOrUpdateShowcasedQuest = useCallback(
    (quest: CompletedQuestShowcase): boolean => {
      if (!address) return false
      return upsertShowcasedQuest(address, quest) !== null
    },
    [address]
  )

  const deleteShowcasedQuest = useCallback(
    (questId: number): boolean => {
      if (!address) return false
      return removeShowcasedQuest(address, questId) !== null
    },
    [address]
  )

  const setQuestPrivacy = useCallback(
    (questId: number, privacy: PrivacyLevel): boolean => {
      if (!address || !profile) return false
      const quest = profile.showcasedQuests.find(q => q.questId === questId)
      if (!quest) return false
      return upsertShowcasedQuest(address, { ...quest, privacy }) !== null
    },
    [address, profile]
  )

  const toggleQuestHighlighted = useCallback(
    (questId: number): boolean => {
      if (!address || !profile) return false
      const quest = profile.showcasedQuests.find(q => q.questId === questId)
      if (!quest) return false
      return upsertShowcasedQuest(address, { ...quest, highlighted: !quest.highlighted }) !== null
    },
    [address, profile]
  )

  const addOrUpdateShowcasedReward = useCallback(
    (reward: RewardShowcase): boolean => {
      if (!address) return false
      return upsertShowcasedReward(address, reward) !== null
    },
    [address]
  )

  const deleteShowcasedReward = useCallback(
    (rewardId: string): boolean => {
      if (!address) return false
      return removeShowcasedReward(address, rewardId) !== null
    },
    [address]
  )

  const setRewardPrivacy = useCallback(
    (rewardId: string, privacy: PrivacyLevel): boolean => {
      if (!address || !profile) return false
      const reward = profile.showcasedRewards.find(r => r.id === rewardId)
      if (!reward) return false
      return upsertShowcasedReward(address, { ...reward, privacy }) !== null
    },
    [address, profile]
  )

  const refreshProfile = useCallback(() => {
    if (address) {
      initializeProfileStore(address, effectiveViewerIsOwner)
    }
  }, [address, effectiveViewerIsOwner])

  const validateCurrent = useCallback((): ReturnType<typeof validateProfileMetadata> => {
    if (!profile) {
      return { valid: true, errors: [], warnings: [] }
    }
    return validateProfileMetadata(profile.metadata)
  }, [profile])

  return {
    profile,
    isLoading,
    error,
    viewerIsOwner: effectiveViewerIsOwner,

    hasContent,

    filteredMetadata,
    filteredShowcasedQuests,
    filteredShowcasedRewards,

    setMetadata,
    setFieldPrivacy,
    setShowcaseSettings,

    addOrUpdateShowcasedQuest,
    deleteShowcasedQuest,
    setQuestPrivacy,
    toggleQuestHighlighted,

    addOrUpdateShowcasedReward,
    deleteShowcasedReward,
    setRewardPrivacy,

    refreshProfile,
    validateCurrent,
  }
}
