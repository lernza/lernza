/**
 * Ledger-aware, network- and contract-scoped React Query key builders.
 *
 * Quest/milestone/enrollment/balance data is fetched from Soroban contracts
 * whose addresses can differ per environment (dev/staging/production) and
 * whose meaning is only valid for the network they were read from. Building
 * query keys as bare `["quest", id]` (the pattern this replaces) means a
 * cached value survives a network or contract-address switch even though
 * it's now describing a different chain entirely -- these builders fold the
 * network passphrase and the relevant contract's address into every key so
 * React Query treats a network/contract change as a different cache
 * namespace, not a stale read of the old one.
 */
import { env } from "@/lib/env"

// A short, stable scope tag rather than the full network passphrase string
// in every key (keeps devtools output readable); still unique per network.
function networkScope(): string {
  return env.VITE_SOROBAN_NETWORK_PASSPHRASE
}

export const queryKeys = {
  quest: (questId: number) =>
    ["quest", networkScope(), env.VITE_QUEST_CONTRACT_ID, questId] as const,

  milestones: (questId: number) =>
    ["milestones", networkScope(), env.VITE_MILESTONE_CONTRACT_ID, questId] as const,

  milestoneCount: (questId: number) =>
    ["milestoneCount", networkScope(), env.VITE_MILESTONE_CONTRACT_ID, questId] as const,

  enrollees: (questId: number) =>
    ["enrollees", networkScope(), env.VITE_QUEST_CONTRACT_ID, questId] as const,

  rewardPool: (questId: number) =>
    ["rewardPool", networkScope(), env.VITE_REWARDS_CONTRACT_ID, questId] as const,

  questAuthority: (questId: number) =>
    ["questAuthority", networkScope(), env.VITE_REWARDS_CONTRACT_ID, questId] as const,
} as const
