/**
 * Learner Profile Store (Issue #1501)
 *
 * Manages profile state with localStorage persistence. Provides utilities
 * for filtering data based on privacy levels and viewer context.
 */
import { createStore, type Store } from "@/lib/store"
import { logger } from "@/lib/logger"
import {
  type LearnerProfile,
  type PublicLearnerProfile,
  type PrivacyLevel,
  type ProfileFieldPrivacy,
  type ProfileMetadata,
  createEmptyProfile,
  PrivacyLevel as PL,
} from "@/lib/profile-types"

const PROFILE_STORAGE_KEY = "lernza_profile"

export interface ProfileStoreState {
  profile: LearnerProfile | null
  isLoading: boolean
  error: string | null
  viewerIsOwner: boolean
}

const INITIAL_STATE: ProfileStoreState = {
  profile: null,
  isLoading: false,
  error: null,
  viewerIsOwner: true,
}

type ProfileStore = Store<ProfileStoreState>

let globalStore: ProfileStore | null = null

export function getProfileStore(): ProfileStore {
  if (!globalStore) {
    globalStore = createStore<ProfileStoreState>(INITIAL_STATE)
  }
  return globalStore
}

function getStorageKey(walletAddress: string): string {
  return `${PROFILE_STORAGE_KEY}_${walletAddress}`
}

function isValidProfile(data: unknown): data is LearnerProfile {
  if (!data || typeof data !== "object") return false
  const p = data as Record<string, unknown>
  return (
    typeof p.version === "string" &&
    typeof p.walletAddress === "string" &&
    typeof p.metadata === "object" &&
    typeof p.fieldPrivacy === "object" &&
    typeof p.showcaseSettings === "object" &&
    Array.isArray(p.showcasedQuests) &&
    Array.isArray(p.showcasedRewards)
  )
}

export function loadProfile(walletAddress: string): LearnerProfile {
  if (typeof window === "undefined" || !window.localStorage) {
    return createEmptyProfile(walletAddress)
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(walletAddress))
    if (!raw) {
      return createEmptyProfile(walletAddress)
    }

    const parsed = JSON.parse(raw)
    if (isValidProfile(parsed)) {
      return parsed
    }

    logger.warn("Invalid profile data in storage, creating new profile", {
      walletAddress,
    })
    return createEmptyProfile(walletAddress)
  } catch (err) {
    logger.error("Failed to load profile from storage", { err, walletAddress })
    return createEmptyProfile(walletAddress)
  }
}

export function saveProfile(profile: LearnerProfile): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false
  }

  try {
    const toSave: LearnerProfile = {
      ...profile,
      updatedAt: Date.now(),
    }
    window.localStorage.setItem(getStorageKey(profile.walletAddress), JSON.stringify(toSave))
    return true
  } catch (err) {
    logger.error("Failed to save profile to storage", { err, walletAddress: profile.walletAddress })
    return false
  }
}

export function initializeProfileStore(walletAddress: string, viewerIsOwner = true): void {
  const store = getProfileStore()
  store.setState({ isLoading: true, error: null, viewerIsOwner })

  try {
    const profile = loadProfile(walletAddress)
    store.setState({
      profile,
      isLoading: false,
      error: null,
      viewerIsOwner,
    })
  } catch (err) {
    store.setState({
      profile: null,
      isLoading: false,
      error: err instanceof Error ? err.message : "Failed to load profile",
      viewerIsOwner,
    })
  }
}

export function updateProfileMetadata(
  walletAddress: string,
  updates: Partial<ProfileMetadata>
): LearnerProfile | null {
  const store = getProfileStore()
  const state = store.getState()
  const current = state.profile ?? loadProfile(walletAddress)

  const updated: LearnerProfile = {
    ...current,
    walletAddress,
    metadata: {
      ...current.metadata,
      ...updates,
    },
    updatedAt: Date.now(),
  }

  const saved = saveProfile(updated)
  if (saved) {
    store.setState({ profile: updated, error: null })
    return updated
  }
  return null
}

export function updateFieldPrivacy(
  walletAddress: string,
  updates: Partial<ProfileFieldPrivacy>
): LearnerProfile | null {
  const store = getProfileStore()
  const state = store.getState()
  const current = state.profile ?? loadProfile(walletAddress)

  const updated: LearnerProfile = {
    ...current,
    walletAddress,
    fieldPrivacy: {
      ...current.fieldPrivacy,
      ...updates,
    },
    updatedAt: Date.now(),
  }

  const saved = saveProfile(updated)
  if (saved) {
    store.setState({ profile: updated, error: null })
    return updated
  }
  return null
}

export function updateShowcaseSettings(
  walletAddress: string,
  updates: Partial<LearnerProfile["showcaseSettings"]>
): LearnerProfile | null {
  const store = getProfileStore()
  const state = store.getState()
  const current = state.profile ?? loadProfile(walletAddress)

  const updated: LearnerProfile = {
    ...current,
    walletAddress,
    showcaseSettings: {
      ...current.showcaseSettings,
      ...updates,
    },
    updatedAt: Date.now(),
  }

  const saved = saveProfile(updated)
  if (saved) {
    store.setState({ profile: updated, error: null })
    return updated
  }
  return null
}

export function upsertShowcasedQuest(
  walletAddress: string,
  quest: LearnerProfile["showcasedQuests"][number]
): LearnerProfile | null {
  const store = getProfileStore()
  const state = store.getState()
  const current = state.profile ?? loadProfile(walletAddress)

  const existingIndex = current.showcasedQuests.findIndex(q => q.questId === quest.questId)
  const updatedQuests = [...current.showcasedQuests]
  if (existingIndex >= 0) {
    updatedQuests[existingIndex] = quest
  } else {
    updatedQuests.push(quest)
  }

  const updated: LearnerProfile = {
    ...current,
    walletAddress,
    showcasedQuests: updatedQuests,
    updatedAt: Date.now(),
  }

  const saved = saveProfile(updated)
  if (saved) {
    store.setState({ profile: updated, error: null })
    return updated
  }
  return null
}

export function removeShowcasedQuest(
  walletAddress: string,
  questId: number
): LearnerProfile | null {
  const store = getProfileStore()
  const state = store.getState()
  const current = state.profile ?? loadProfile(walletAddress)

  const updated: LearnerProfile = {
    ...current,
    walletAddress,
    showcasedQuests: current.showcasedQuests.filter(q => q.questId !== questId),
    updatedAt: Date.now(),
  }

  const saved = saveProfile(updated)
  if (saved) {
    store.setState({ profile: updated, error: null })
    return updated
  }
  return null
}

export function upsertShowcasedReward(
  walletAddress: string,
  reward: LearnerProfile["showcasedRewards"][number]
): LearnerProfile | null {
  const store = getProfileStore()
  const state = store.getState()
  const current = state.profile ?? loadProfile(walletAddress)

  const existingIndex = current.showcasedRewards.findIndex(r => r.id === reward.id)
  const updatedRewards = [...current.showcasedRewards]
  if (existingIndex >= 0) {
    updatedRewards[existingIndex] = reward
  } else {
    updatedRewards.push(reward)
  }

  const updated: LearnerProfile = {
    ...current,
    walletAddress,
    showcasedRewards: updatedRewards,
    updatedAt: Date.now(),
  }

  const saved = saveProfile(updated)
  if (saved) {
    store.setState({ profile: updated, error: null })
    return updated
  }
  return null
}

export function removeShowcasedReward(
  walletAddress: string,
  rewardId: string
): LearnerProfile | null {
  const store = getProfileStore()
  const state = store.getState()
  const current = state.profile ?? loadProfile(walletAddress)

  const updated: LearnerProfile = {
    ...current,
    walletAddress,
    showcasedRewards: current.showcasedRewards.filter(r => r.id !== rewardId),
    updatedAt: Date.now(),
  }

  const saved = saveProfile(updated)
  if (saved) {
    store.setState({ profile: updated, error: null })
    return updated
  }
  return null
}

function canView(level: PrivacyLevel, viewerIsOwner: boolean): boolean {
  if (viewerIsOwner) return true
  return level === PL.Public
}

export function filterMetadataForViewer(
  metadata: ProfileMetadata,
  privacy: ProfileFieldPrivacy,
  viewerIsOwner: boolean
): Partial<ProfileMetadata> {
  const filtered: Partial<ProfileMetadata> = {}

  if (canView(privacy.displayName, viewerIsOwner)) {
    filtered.displayName = metadata.displayName
  }
  if (canView(privacy.bio, viewerIsOwner)) {
    filtered.bio = metadata.bio
  }
  if (canView(privacy.location, viewerIsOwner)) {
    filtered.location = metadata.location
  }
  if (canView(privacy.avatarUrl, viewerIsOwner)) {
    filtered.avatarUrl = metadata.avatarUrl
  }
  if (canView(privacy.tags, viewerIsOwner)) {
    filtered.tags = metadata.tags
  }
  if (canView(privacy.links, viewerIsOwner)) {
    filtered.links = metadata.links.filter(l => canView(l.privacy, viewerIsOwner))
  }

  return filtered
}

export function getPublicProfile(profile: LearnerProfile): PublicLearnerProfile {
  const { showcaseSettings } = profile

  const filteredQuests = showcaseSettings.showCompletedQuests
    ? profile.showcasedQuests.filter(q => canView(q.privacy, false))
    : []

  const filteredRewards = showcaseSettings.showRewards
    ? profile.showcasedRewards.filter(r => canView(r.privacy, false))
    : []

  return {
    walletAddress: profile.walletAddress,
    metadata: filterMetadataForViewer(profile.metadata, profile.fieldPrivacy, false),
    showcasedQuests: filteredQuests,
    showcasedRewards: filteredRewards,
    showcaseSettings: {
      ...showcaseSettings,
      questsPrivacy: showcaseSettings.questsPrivacy,
      rewardsPrivacy: showcaseSettings.rewardsPrivacy,
    },
  }
}

export function hasProfileContent(profile: LearnerProfile): boolean {
  const m = profile.metadata
  return (
    m.displayName.trim().length > 0 ||
    m.bio.trim().length > 0 ||
    m.location.trim().length > 0 ||
    m.avatarUrl.trim().length > 0 ||
    m.tags.length > 0 ||
    m.links.length > 0 ||
    profile.showcasedQuests.length > 0 ||
    profile.showcasedRewards.length > 0
  )
}
