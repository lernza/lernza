import { useDeferredValue, useState } from "react"
import type { QuestInfo } from "@/lib/contract-types"
import type { QuestStatSummary } from "@/hooks/use-quest-stats"
import { useNowSeconds } from "@/hooks/use-now"
import { getQuestLifecycleStatus } from "@/lib/utils"
import { DASHBOARD_QUEST_PAGE_SIZE } from "@/pages/dashboard/constants"

export type QuestDiscoveryStatus = "all" | "active" | "completed"
export type QuestScopeFilter = "all" | "owned" | "enrolled"
export type QuestPresetFilter = "none" | "ending-soon" | "recently-funded" | "recently-verified"
export type QuestSortOrder = "newest" | "ending-soon" | "most-enrolled" | "highest-reward"
export type TagFilterMode = "AND" | "OR"

export interface DashboardFilterSources {
  publicQuests: QuestInfo[]
  ownedQuests: QuestInfo[]
  enrolledQuests: QuestInfo[]
  extraPublicQuests: QuestInfo[]
  questStats: Record<number, QuestStatSummary | undefined>
}

/**
 * Owns every quest-discovery filter (scope, preset, search, category, creator,
 * reward token, reward range, status, tags, sort) and derives the visible quest
 * list from them.
 *
 * Kept out of the page so the page stays a layout orchestrator: the filter state
 * machine and its derived pipeline are the bulk of the dashboard's logic and are
 * independently testable here.
 */
export function useDashboardFilters({
  publicQuests,
  ownedQuests,
  enrolledQuests,
  extraPublicQuests,
  questStats,
}: DashboardFilterSources) {
  const [filter, setFilter] = useState<QuestScopeFilter>("all")
  const [preset, setPreset] = useState<QuestPresetFilter>("none")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [creatorFilter, setCreatorFilter] = useState("all")
  const [rewardTokenFilter, setRewardTokenFilter] = useState("all")
  const [sortBy, setSortBy] = useState<QuestSortOrder>("newest")
  const [statusFilter, setStatusFilter] = useState<QuestDiscoveryStatus>("all")
  const [rewardMin, setRewardMin] = useState<string>("")
  const [rewardMax, setRewardMax] = useState<string>("")
  const deferredSearch = useDeferredValue(search)
  const deferredRewardMin = useDeferredValue(rewardMin)
  const deferredRewardMax = useDeferredValue(rewardMax)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>("OR")
  const [tagInput, setTagInput] = useState("")
  const [displayCount, setDisplayCount] = useState(DASHBOARD_QUEST_PAGE_SIZE)

  // Live clock: deadline filters and derived lifecycle status must reflect the
  // real time, not the value sampled on first render — a tab left open in the
  // background used to keep showing quests as "ending soon" long after their
  // deadline passed (issue #1335). A minute is enough granularity here and
  // keeps the (potentially long) quest list from re-rendering more often.
  const nowSeconds = useNowSeconds(60_000)

  const loadedPublicQuests = [...publicQuests, ...extraPublicQuests]

  const scopedQuests =
    filter === "owned" ? ownedQuests : filter === "enrolled" ? enrolledQuests : loadedPublicQuests

  const presetFilteredQuests = (() => {
    if (preset === "ending-soon") {
      const sevenDaysFromNow = nowSeconds + 7 * 24 * 60 * 60
      return scopedQuests.filter(
        q => q.deadline > 0 && q.deadline > nowSeconds && q.deadline <= sevenDaysFromNow
      )
    }
    if (preset === "recently-funded") {
      const thirtyDaysAgo = nowSeconds - 30 * 24 * 60 * 60
      return scopedQuests.filter(q => q.createdAt >= thirtyDaysAgo)
    }
    if (preset === "recently-verified") {
      return scopedQuests.filter(q => q.verified)
    }
    return scopedQuests
  })()

  const availableCategories = Array.from(
    new Set(scopedQuests.map(q => q.category).filter((c): c is string => !!c))
  ).sort()
  const availableCreators = Array.from(new Set(scopedQuests.map(q => q.owner))).sort()
  const availableRewardTokens = Array.from(new Set(scopedQuests.map(q => q.tokenAddr))).sort()

  // Derive quest status from on-chain state via the single shared
  // lifecycle-status function (see lib/utils.ts's getQuestLifecycleStatus doc
  // comment) instead of reimplementing the active/expired/archived/cancelled
  // logic locally with its own edge cases.
  function deriveQuestStatus(q: { status: number; deadline: number }): QuestDiscoveryStatus {
    const lifecycle = getQuestLifecycleStatus({
      status: q.status as QuestInfo["status"],
      deadline: q.deadline,
    })
    return lifecycle === "active" ? "active" : "completed"
  }

  const statusFilteredQuests =
    statusFilter === "all"
      ? presetFilteredQuests
      : presetFilteredQuests.filter(q => deriveQuestStatus(q) === statusFilter)

  const categoryFilteredQuests =
    category === "all"
      ? statusFilteredQuests
      : statusFilteredQuests.filter(q => q.category === category)

  const creatorFilteredQuests =
    creatorFilter === "all"
      ? categoryFilteredQuests
      : categoryFilteredQuests.filter(q => q.owner === creatorFilter)

  const tokenFilteredQuests =
    rewardTokenFilter === "all"
      ? creatorFilteredQuests
      : creatorFilteredQuests.filter(q => q.tokenAddr === rewardTokenFilter)

  // Reward range filter (uses deferred values to avoid re-rendering on every keystroke)
  const rewardMinNum = deferredRewardMin !== "" ? Number(deferredRewardMin) : 0
  const rewardMaxNum = deferredRewardMax !== "" ? Number(deferredRewardMax) : Infinity
  const rewardFilteredQuests = tokenFilteredQuests.filter(q => {
    const stats = questStats[q.id]
    const pool = stats?.poolBalance ?? 0
    if (deferredRewardMin !== "" && pool < rewardMinNum) return false
    if (deferredRewardMax !== "" && pool > rewardMaxNum) return false
    return true
  })

  const searchQuery = deferredSearch.trim().toLowerCase()
  const searchedQuests = searchQuery
    ? rewardFilteredQuests.filter(q => {
        const haystack = [q.name, q.description, q.category, ...(q.tags ?? [])]
          .join(" ")
          .toLowerCase()
        return haystack.includes(searchQuery)
      })
    : rewardFilteredQuests

  // Tag filter — multi-tag AND/OR (issue #1635)
  const allKnownTags = Array.from(new Set(scopedQuests.flatMap(q => q.tags ?? []))).sort()
  const tagSuggestions = tagInput.trim()
    ? allKnownTags.filter(
        tag =>
          tag.toLowerCase().includes(tagInput.trim().toLowerCase()) && !selectedTags.includes(tag)
      )
    : []
  const tagFilteredQuests =
    selectedTags.length === 0
      ? searchedQuests
      : searchedQuests.filter(q => {
          const qtags = q.tags ?? []
          return tagFilterMode === "AND"
            ? selectedTags.every(tag => qtags.includes(tag))
            : selectedTags.some(tag => qtags.includes(tag))
        })

  const sortedQuests = [...tagFilteredQuests].sort((a, b) => {
    const statsA = questStats[a.id]
    const statsB = questStats[b.id]

    switch (sortBy) {
      case "ending-soon": {
        const deadlineA = a.deadline > 0 ? a.deadline : Infinity
        const deadlineB = b.deadline > 0 ? b.deadline : Infinity
        return deadlineA - deadlineB
      }
      case "most-enrolled":
        return (statsB?.enrolleeCount ?? 0) - (statsA?.enrolleeCount ?? 0)
      case "highest-reward":
        return (statsB?.poolBalance ?? 0) - (statsA?.poolBalance ?? 0)
      case "newest":
      default:
        return b.createdAt - a.createdAt
    }
  })

  return {
    filter,
    setFilter,
    preset,
    setPreset,
    search,
    setSearch,
    category,
    setCategory,
    creatorFilter,
    setCreatorFilter,
    rewardTokenFilter,
    setRewardTokenFilter,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    rewardMin,
    setRewardMin,
    rewardMax,
    setRewardMax,
    selectedTags,
    setSelectedTags,
    tagFilterMode,
    setTagFilterMode,
    tagInput,
    setTagInput,
    displayCount,
    setDisplayCount,
    availableCategories,
    availableCreators,
    availableRewardTokens,
    tagSuggestions,
    searchQuery,
    sortedQuests,
    visibleQuests: sortedQuests.slice(0, displayCount),
  }
}
