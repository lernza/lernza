import { describe, it, expect, beforeEach, vi } from "vitest"
import { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  invalidateQuestQueries,
  invalidateEnrollmentQueries,
  invalidateFundingQueries,
  invalidatePayoutQueries,
} from "@/lib/query-invalidation"

vi.mock("@/lib/env", () => ({
  env: {
    VITE_SOROBAN_NETWORK_PASSPHRASE: "Standalone Network ; February 2017",
    VITE_QUEST_CONTRACT_ID: "CQUEST",
    VITE_MILESTONE_CONTRACT_ID: "CMILESTONE",
    VITE_REWARDS_CONTRACT_ID: "CREWARDS",
    VITE_REWARDS_TOKEN_CONTRACT_ID: "CTOKEN",
  },
}))

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  })
}

async function seed(queryClient: QueryClient, questId: number) {
  await queryClient.prefetchQuery({ queryKey: queryKeys.quest(questId), queryFn: async () => ({}) })
  await queryClient.prefetchQuery({
    queryKey: queryKeys.milestones(questId),
    queryFn: async () => [],
  })
  await queryClient.prefetchQuery({
    queryKey: queryKeys.milestoneCount(questId),
    queryFn: async () => 0,
  })
  await queryClient.prefetchQuery({
    queryKey: queryKeys.enrollees(questId),
    queryFn: async () => [],
  })
  await queryClient.prefetchQuery({
    queryKey: queryKeys.rewardPool(questId),
    queryFn: async () => 0n,
  })
  await queryClient.prefetchQuery({
    queryKey: queryKeys.questAuthority(questId),
    queryFn: async () => null,
  })
  await queryClient.prefetchQuery({ queryKey: ["walletBalance"], queryFn: async () => ({}) })
}

function isStale(queryClient: QueryClient, key: readonly unknown[]): boolean {
  const state = queryClient.getQueryState(key as unknown[])
  return state?.isInvalidated ?? false
}

describe("query-invalidation — invalidation relationships", () => {
  let queryClient: QueryClient

  beforeEach(async () => {
    queryClient = makeClient()
    await seed(queryClient, 42)
  })

  it("invalidateQuestQueries marks quest, milestones, and milestoneCount stale — nothing else", async () => {
    await invalidateQuestQueries(queryClient, 42)

    expect(isStale(queryClient, queryKeys.quest(42))).toBe(true)
    expect(isStale(queryClient, queryKeys.milestones(42))).toBe(true)
    expect(isStale(queryClient, queryKeys.milestoneCount(42))).toBe(true)

    expect(isStale(queryClient, queryKeys.enrollees(42))).toBe(false)
    expect(isStale(queryClient, queryKeys.rewardPool(42))).toBe(false)
    expect(isStale(queryClient, queryKeys.questAuthority(42))).toBe(false)
  })

  it("invalidateEnrollmentQueries marks enrollees and quest stale — not milestones or funding", async () => {
    await invalidateEnrollmentQueries(queryClient, 42)

    expect(isStale(queryClient, queryKeys.enrollees(42))).toBe(true)
    expect(isStale(queryClient, queryKeys.quest(42))).toBe(true)

    expect(isStale(queryClient, queryKeys.milestones(42))).toBe(false)
    expect(isStale(queryClient, queryKeys.rewardPool(42))).toBe(false)
  })

  it("invalidateFundingQueries marks rewardPool and questAuthority stale — not quest or enrollees", async () => {
    await invalidateFundingQueries(queryClient, 42)

    expect(isStale(queryClient, queryKeys.rewardPool(42))).toBe(true)
    expect(isStale(queryClient, queryKeys.questAuthority(42))).toBe(true)

    expect(isStale(queryClient, queryKeys.quest(42))).toBe(false)
    expect(isStale(queryClient, queryKeys.enrollees(42))).toBe(false)
  })

  it("invalidatePayoutQueries marks rewardPool and walletBalance stale", async () => {
    await invalidatePayoutQueries(queryClient, 42)

    expect(isStale(queryClient, queryKeys.rewardPool(42))).toBe(true)
    expect(isStale(queryClient, ["walletBalance"])).toBe(true)

    expect(isStale(queryClient, queryKeys.quest(42))).toBe(false)
  })

  it("invalidation is scoped to the given questId — a different quest's cache is untouched", async () => {
    await seed(queryClient, 7)

    await invalidateQuestQueries(queryClient, 42)

    expect(isStale(queryClient, queryKeys.quest(42))).toBe(true)
    expect(isStale(queryClient, queryKeys.quest(7))).toBe(false)
  })
})

describe("query-keys — network and contract scoping", () => {
  it("includes the contract address and network passphrase in every key", () => {
    expect(queryKeys.quest(1)).toEqual([
      "quest",
      "Standalone Network ; February 2017",
      "CQUEST",
      1,
    ])
    expect(queryKeys.rewardPool(1)).toEqual([
      "rewardPool",
      "Standalone Network ; February 2017",
      "CREWARDS",
      1,
    ])
  })

  it("produces different keys for different quest ids", () => {
    expect(queryKeys.quest(1)).not.toEqual(queryKeys.quest(2))
  })
})
