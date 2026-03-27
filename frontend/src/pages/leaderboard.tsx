import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Trophy, Users, Coins, RefreshCw } from "lucide-react"
import { useAsyncData } from "@/hooks/use-async-data"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/async-states"
import { questClient } from "@/lib/contracts/quest"
import { rewardsClient } from "@/lib/contracts/rewards"
import { formatTokens, shortenAddress } from "@/lib/utils"
import { useState } from "react"
import { cn } from "@/lib/utils"

type ActiveTab = "earners" | "quests"

interface EarnerEntry {
  address: string
  totalEarned: bigint
  rank: number
}

interface ActiveQuestEntry {
  id: number
  name: string
  enrolleeCount: number
  rank: number
}

async function fetchTopEarners(): Promise<EarnerEntry[]> {
  const quests = await questClient.getQuests()
  const enrolleeSets = await Promise.all(quests.map(q => questClient.getEnrollees(q.id)))

  const allAddresses = new Set<string>()
  for (const list of enrolleeSets) {
    for (const addr of list) {
      allAddresses.add(addr)
    }
  }

  const entries = await Promise.all(
    Array.from(allAddresses).map(async address => {
      const totalEarned = await rewardsClient.getUserEarnings(address)
      return { address, totalEarned }
    })
  )

  return entries
    .sort((a, b) => (b.totalEarned > a.totalEarned ? 1 : b.totalEarned < a.totalEarned ? -1 : 0))
    .slice(0, 20)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

async function fetchMostActiveQuests(): Promise<ActiveQuestEntry[]> {
  const quests = await questClient.listPublicQuests(0, 50)
  const withCounts = await Promise.all(
    quests.map(async q => {
      const enrollees = await questClient.getEnrollees(q.id)
      return { id: q.id, name: q.name, enrolleeCount: enrollees.length }
    })
  )

  return withCounts
    .sort((a, b) => b.enrolleeCount - a.enrolleeCount)
    .slice(0, 20)
    .map((q, i) => ({ ...q, rank: i + 1 }))
}

function RankBadge({ rank }: { rank: number }) {
  const base =
    "inline-flex h-8 w-8 items-center justify-center border-[2px] border-border text-sm font-black shadow-[2px_2px_0_var(--color-border)]"
  if (rank === 1) return <span className={cn(base, "bg-yellow-400 text-black")}>#1</span>
  if (rank === 2)
    return (
      <span className={cn(base, "bg-zinc-300 text-black dark:bg-zinc-600 dark:text-white")}>
        #2
      </span>
    )
  if (rank === 3) return <span className={cn(base, "bg-amber-600 text-white")}>#3</span>
  return <span className={cn(base, "bg-background text-foreground")}>#{rank}</span>
}

export function Leaderboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ActiveTab>("earners")

  const {
    data: earners,
    isLoading: earnersLoading,
    error: earnersError,
    isEmpty: earnersEmpty,
    refetch: refetchEarners,
  } = useAsyncData(fetchTopEarners, { enabled: activeTab === "earners" })

  const {
    data: activeQuests,
    isLoading: questsLoading,
    error: questsError,
    isEmpty: questsEmpty,
    refetch: refetchQuests,
  } = useAsyncData(fetchMostActiveQuests, { enabled: activeTab === "quests" })

  const refetchActive = useCallback(() => {
    if (activeTab === "earners") return refetchEarners()
    return refetchQuests()
  }, [activeTab, refetchEarners, refetchQuests])

  useEffect(() => {
    const id = setInterval(
      () => {
        void refetchActive()
      },
      5 * 60 * 1000
    )
    return () => clearInterval(id)
  }, [refetchActive])

  const isLoading = activeTab === "earners" ? earnersLoading : questsLoading
  const error = activeTab === "earners" ? earnersError : questsError
  const isEmpty = activeTab === "earners" ? earnersEmpty : questsEmpty

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="border-border bg-primary mb-4 inline-flex items-center gap-2 border-[3px] px-4 py-2 shadow-[4px_4px_0_var(--color-border)]">
          <Trophy className="h-5 w-5" />
          <span className="text-sm font-black tracking-wider uppercase">Leaderboard</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Top performers</h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          Refreshes automatically every 5 minutes.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-border mb-6 flex gap-0 border-[3px] shadow-[4px_4px_0_var(--color-border)]">
        <button
          onClick={() => setActiveTab("earners")}
          className={cn(
            "border-border flex flex-1 cursor-pointer items-center justify-center gap-2 border-r-[3px] px-4 py-3 text-sm font-black transition-colors",
            activeTab === "earners" ? "bg-primary text-black" : "bg-background hover:bg-secondary"
          )}
        >
          <Coins className="h-4 w-4" />
          Top Earners
        </button>
        <button
          onClick={() => setActiveTab("quests")}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm font-black transition-colors",
            activeTab === "quests" ? "bg-primary text-black" : "bg-background hover:bg-secondary"
          )}
        >
          <Users className="h-4 w-4" />
          Most Active Quests
        </button>
      </div>

      {/* Refresh button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => void refetchActive()}
          disabled={isLoading}
          className="border-border neo-press focus-visible:ring-ring hover:bg-secondary flex cursor-pointer items-center gap-1.5 border-[2px] px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_var(--color-border)] transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {isLoading && <LoadingState message="Fetching on-chain data…" />}
      {!isLoading && error && <ErrorState message={error} />}
      {!isLoading && !error && isEmpty && (
        <EmptyState
          title="No data yet"
          description="On-chain activity will appear here once quests have enrollees."
        />
      )}

      {/* Top Earners list */}
      {!isLoading && !error && !isEmpty && activeTab === "earners" && earners && (
        <ol className="space-y-2">
          {earners.map(entry => (
            <li
              key={entry.address}
              className="border-border bg-card flex cursor-pointer items-center gap-4 border-[2px] px-4 py-3 shadow-[3px_3px_0_var(--color-border)] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-border)]"
              onClick={() => navigate("/profile")}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && navigate("/profile")}
            >
              <RankBadge rank={entry.rank} />
              <span className="flex-1 font-mono text-sm font-bold">
                {shortenAddress(entry.address, 6)}
              </span>
              <span className="border-border bg-background border-[2px] px-2 py-1 text-xs font-black shadow-[2px_2px_0_var(--color-border)]">
                {formatTokens(entry.totalEarned)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Most Active Quests list */}
      {!isLoading && !error && !isEmpty && activeTab === "quests" && activeQuests && (
        <ol className="space-y-2">
          {activeQuests.map(entry => (
            <li
              key={entry.id}
              className="border-border bg-card flex cursor-pointer items-center gap-4 border-[2px] px-4 py-3 shadow-[3px_3px_0_var(--color-border)] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-border)]"
              onClick={() => navigate(`/quest/${entry.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && navigate(`/quest/${entry.id}`)}
            >
              <RankBadge rank={entry.rank} />
              <span className="flex-1 truncate text-sm font-bold">{entry.name}</span>
              <span className="border-border bg-background flex items-center gap-1 border-[2px] px-2 py-1 text-xs font-black shadow-[2px_2px_0_var(--color-border)]">
                <Users className="h-3 w-3" />
                {entry.enrolleeCount}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
