/**
 * Ledger-aware cache invalidation for quest data (Issue #1481).
 *
 * React Query's `staleTime` alone doesn't know when an on-chain write has
 * actually confirmed -- a quest's cached data can look "fresh" for up to
 * 30s after a confirmed enrollment, funding, or payout tx, even though the
 * ledger already reflects the change. These helpers are called after a
 * transaction confirms so the relevant queries are marked stale and
 * refetched immediately, rather than waiting out their staleTime.
 *
 * Each helper only invalidates the query *families* actually affected by
 * the action that just confirmed, using queryKeys' scoped key builders --
 * `invalidateQueries` matches by prefix, so `queryKeys.quest(questId)`
 * (which includes the network + contract address) invalidates exactly that
 * quest's cached entry, not every quest cached for every network.
 */
import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

/** After createQuest, enrollQuest, verifyMilestone, or any action that changes a quest's own state. */
export function invalidateQuestQueries(queryClient: QueryClient, questId: number): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.quest(questId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.milestones(questId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.milestoneCount(questId) }),
  ]).then(() => undefined)
}

/** After enrollQuest specifically -- the enrollee list changed, quest state may have too (capacity, status). */
export function invalidateEnrollmentQueries(
  queryClient: QueryClient,
  questId: number
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.enrollees(questId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.quest(questId) }),
  ]).then(() => undefined)
}

/** After fundQuest -- the reward pool balance changed. */
export function invalidateFundingQueries(
  queryClient: QueryClient,
  questId: number
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.rewardPool(questId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.questAuthority(questId) }),
  ]).then(() => undefined)
}

/**
 * After a payout -- both the reward pool and the recipient's wallet balance
 * changed. useWalletBalance (use-wallet-balance.ts) keys its query as
 * `["walletBalance", address, networkName]` rather than through
 * queryKeys.walletBalance (nothing currently consumes that builder) -- match
 * that real shape here. Passing only the `"walletBalance"` prefix (no
 * address) invalidates every cached wallet balance rather than just the
 * recipient's; broader than ideal, but correct, since a recipient address
 * alone can't reconstruct the networkName segment this hook also keys on.
 */
export function invalidatePayoutQueries(
  queryClient: QueryClient,
  questId: number
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.rewardPool(questId) }),
    queryClient.invalidateQueries({ queryKey: ["walletBalance"] }),
  ]).then(() => undefined)
}
