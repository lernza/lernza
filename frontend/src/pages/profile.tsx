import {
  Wallet,
  Coins,
  TrendingUp,
  Trophy,
  Sparkles,
  History,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Target,
  Users,
  ExternalLink,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { useContractData } from "@/hooks/use-async-data"
import { useUserRole } from "@/hooks/use-user-role"
import { formatTokens } from "@/lib/utils"
import { rewardsClient } from "@/lib/contracts/rewards"
import { questClient } from "@/lib/contracts/quest"
import { fetchWalletActivity, type WalletActivityItem } from "@/lib/horizon-activity"
import { navigateToPath } from "@/lib/navigation"

type ProfileTab = "overview" | "activity"

function formatActivityDate(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function getActivityLabel(type: WalletActivityItem["type"]) {
  switch (type) {
    case "enrolled":
      return "Enrolled"
    case "completed":
      return "Completed"
    case "rewarded":
      return "Rewarded"
    case "left":
      return "Left quest"
  }
}

function getActivityDescription(item: WalletActivityItem) {
  switch (item.type) {
    case "enrolled":
      return `Joined ${item.questName}`
    case "completed":
      return `Completion verified for ${item.questName}`
    case "rewarded":
      return `Reward received from ${item.questName}`
    case "left":
      return `Left ${item.questName}`
  }
}

/* ─── Generated Avatar from wallet address ─── */

function WalletAvatar({ address }: { address: string }) {
  // Generate a grid of colored blocks from the address
  const colors = ["#FACC15", "#22C55E", "#000000", "#F5F5F4", "#FFFFFF"]
  const cells = Array.from({ length: 16 }, (_, i) => {
    const charCode = address.charCodeAt(i % address.length) || 0
    return colors[charCode % colors.length]
  })

  return (
    <div className="border-border grid h-20 w-20 shrink-0 grid-cols-4 overflow-hidden border shadow-md">
      {cells.map((color, i) => (
        <div key={i} style={{ backgroundColor: color }} />
      ))}
    </div>
  )
}

export function Profile() {
  const { connected, connect, address } = useWallet()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview")
  const [activityItems, setActivityItems] = useState<WalletActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [nextActivityCursor, setNextActivityCursor] = useState<string | null>(null)
  const [capReached, setCapReached] = useState(false)
  const { role, isLoading: roleLoading } = useUserRole()

  // Use the new async hook for earnings data
  const {
    data: totalEarned,
    isLoading: earningsLoading,
    error: earningsError,
  } = useContractData(
    "rewards",
    async () => {
      if (!address) throw new Error("No wallet address")
      const earnings = await rewardsClient.getUserEarnings(address)
      if (earnings === null) {
        throw new Error("not configured") // Special error for contract unavailability
      }
      return earnings
    },
    {
      enabled: connected && !!address,
      dependencies: [connected, address],
    }
  )

  const getRoleLabel = () => {
    if (roleLoading) return "Loading..."
    switch (role) {
      case "owner":
        return "Quest Owner"
      case "learner":
        return "Learner"
      case "mixed":
        return "Owner & Learner"
      default:
        return "Community Member"
    }
  }

  const getRoleBadgeVariant = () => {
    switch (role) {
      case "owner":
        return "default"
      case "learner":
        return "success"
      case "mixed":
        return "default"
      default:
        return "secondary"
    }
  }
  const {
    data: creatorStats,
    isLoading: statsLoading,
    error: statsError,
  } = useContractData(
    "quest",
    async () => {
      if (!address) throw new Error("No wallet address")
      const ownedQuests = await questClient.listQuestsByOwner(address)

      let totalEnrollees = 0
      let totalPoolBalance = 0n

      const questsWithStats = await Promise.all(
        ownedQuests.map(async q => {
          try {
            const enrollees = await questClient.getEnrollees(q.id)
            const balance = await rewardsClient.getPoolBalance(q.id)
            totalEnrollees += enrollees.length
            totalPoolBalance += balance
            return { ...q, enrolleesCount: enrollees.length, poolBalance: balance }
          } catch {
            return { ...q, enrolleesCount: 0, poolBalance: 0n }
          }
        })
      )

      return {
        totalQuests: ownedQuests.length,
        totalEnrollees,
        totalPoolBalance,
        quests: questsWithStats,
      }
    },
    {
      enabled: connected && !!address,
      dependencies: [connected, address],
    }
  )

  useEffect(() => {
    if (!connected || !address || activeTab !== "activity") {
      return
    }

    const controller = new AbortController()

    const loadInitialActivity = async () => {
      setActivityItems([])
      setNextActivityCursor(null)
      setCapReached(false)
      setActivityLoading(true)
      setActivityError(null)

      try {
        const page = await fetchWalletActivity(address, null, 0, controller.signal)
        if (controller.signal.aborted) return

        setActivityItems(page.items)
        setNextActivityCursor(page.nextCursor)
        setCapReached(page.capReached)
      } catch (error) {
        if (controller.signal.aborted) return
        setActivityError(error instanceof Error ? error.message : "Failed to load activity.")
      } finally {
        if (!controller.signal.aborted) {
          setActivityLoading(false)
        }
      }
    }

    void loadInitialActivity()

    return () => {
      controller.abort()
    }
  }, [activeTab, address, connected])

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLoadMoreActivity = async (signal?: AbortSignal) => {
    if (!address || !nextActivityCursor || activityLoading) {
      return
    }

    setActivityLoading(true)
    setActivityError(null)

    try {
      const page = await fetchWalletActivity(
        address,
        nextActivityCursor,
        activityItems.length,
        signal
      )
      if (signal?.aborted) return
      setActivityItems(current => [...current, ...page.items])
      setNextActivityCursor(page.nextCursor)
      setCapReached(page.capReached)
    } catch (error) {
      if (signal?.aborted) return
      setActivityError(error instanceof Error ? error.message : "Failed to load activity.")
    } finally {
      if (!signal?.aborted) {
        setActivityLoading(false)
      }
    }
  }

  const formattedEarned =
    totalEarned === null
      ? "Unavailable"
      : totalEarned > BigInt(Number.MAX_SAFE_INTEGER)
        ? totalEarned.toString()
        : formatTokens(Number(totalEarned), 7, "USDC")

  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div
          className="bg-accent border-border animate-float absolute top-[12%] right-[7%] h-20 w-20 rotate-12 border opacity-[0.08] shadow-md"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="bg-success border-border animate-float absolute bottom-[18%] left-[5%] h-14 w-14 -rotate-6 border-2 opacity-[0.07] shadow-md"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
        <div
          className="bg-accent border-border animate-float absolute top-[55%] right-[4%] h-10 w-10 rotate-45 border-2 opacity-[0.06] shadow-sm"
          style={{ animationDuration: "7s", animationDelay: "2s" }}
        />

        <div className="relative mx-auto max-w-lg px-4">
          <div className="bg-card text-card-foreground border-border animate-scale-in overflow-hidden border shadow-xl">
            <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
              <span className="text-xs font-semibold tracking-wider uppercase">Profile</span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>

            <div className="p-8 text-center sm:p-10">
              <div className="bg-accent border-border animate-fade-in-up mx-auto mb-6 flex h-20 w-20 items-center justify-center border shadow-md">
                <Wallet className="h-8 w-8" />
              </div>
              <h1 className="animate-fade-in-up stagger-1 mb-3 text-2xl font-semibold sm:text-3xl">
                Connect your wallet
              </h1>
              <p className="text-muted-foreground animate-fade-in-up stagger-2 mx-auto mb-8 max-w-sm">
                Connect your Freighter wallet to view your profile, track earnings, and see your
                quest history.
              </p>
              <Button
                size="lg"
                onClick={connect}
                className="shimmer-on-hover animate-fade-in-up stagger-3"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>

              <div className="border-border animate-fade-in-up stagger-4 mt-8 border-t-2 pt-6">
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Trophy, text: "View achievements" },
                    { icon: Coins, text: "Track earnings" },
                    { icon: TrendingUp, text: "See progress" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2">
                      <div className="bg-secondary border-border flex h-6 w-6 items-center justify-center border-[1.5px]">
                        <item.icon className="h-3 w-3" />
                      </div>
                      <span className="text-muted-foreground text-xs font-bold">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-accent border-border animate-fade-in-up stagger-5 absolute -top-4 -right-4 hidden h-10 w-10 rotate-12 border-2 shadow-md sm:block" />
          <div className="bg-success border-border animate-fade-in-up stagger-6 absolute -bottom-3 -left-3 hidden h-8 w-8 -rotate-6 border-2 shadow-sm sm:block" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Profile header */}
      <div className="animate-fade-in-up relative mb-8">
        <div className="bg-accent border-border overflow-hidden border shadow-lg">
          <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-20" />

          {/* Banner */}
          <div className="relative h-20 sm:h-28">
            <div
              className="bg-foreground/5 border-foreground/10 animate-float absolute top-3 right-6 h-10 w-10 rotate-12 border-2"
              style={{ animationDuration: "7s" }}
            />
            <div
              className="bg-foreground/5 border-foreground/10 animate-float absolute right-24 bottom-2 h-6 w-6 -rotate-6 border-2"
              style={{ animationDuration: "5s", animationDelay: "1s" }}
            />
          </div>

          {/* Profile info */}
          <div className="bg-card text-card-foreground border-border relative border-t px-6 py-5">
            <div className="-mt-14 flex flex-col items-start gap-6 sm:-mt-16 sm:flex-row sm:items-center">
              <WalletAvatar address={address || ""} />

              <div className="mt-2 min-w-0 flex-1 sm:mt-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{getRoleLabel()}</h2>
                  <Badge variant={getRoleBadgeVariant()} className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-muted-foreground max-w-[140px] truncate font-mono text-sm font-bold sm:max-w-xs">
                    {address}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="border-border bg-card neo-press hover:bg-secondary flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-2 shadow-sm"
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <Check className="text-success h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="sm:mt-6">
                <div className="bg-accent border-border border-2 px-5 py-3 shadow-md">
                  <div className="flex items-center gap-2">
                    {earningsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <p className="text-2xl font-semibold tabular-nums">{formattedEarned}</p>
                  </div>
                  <p className="text-xs font-bold">
                    {earningsLoading ? "Loading on-chain earnings" : "USDC earned on-chain"}
                  </p>
                </div>
                <Badge variant="outline" className="border font-bold">
                  {activityItems.length} loaded
                </Badge>
              </div>
            </div>

            {activityLoading && activityItems.length === 0 ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Loader2 className="text-accent mb-4 h-8 w-8 animate-spin" />
                  <h3 className="mb-2 font-semibold">Loading activity</h3>
                  <p className="text-muted-foreground text-sm">
                    Fetching recent wallet operations from Horizon.
                  </p>
                </CardContent>
              </Card>
            ) : activityError ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <AlertCircle className="text-destructive mb-4 h-8 w-8" />
                  <h3 className="mb-2 font-semibold">Could not load activity</h3>
                  <p className="text-muted-foreground max-w-md text-sm">{activityError}</p>
                </CardContent>
              </Card>
            ) : activityItems.length === 0 ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <History className="text-muted-foreground mb-4 h-8 w-8" />
                  <h3 className="mb-2 font-semibold">No wallet activity yet</h3>
                  <p className="text-muted-foreground max-w-md text-sm">
                    Enroll in a quest or complete a milestone to start building your on-chain
                    timeline.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {activityItems.map(item => (
                  <Card key={item.id} className="animate-fade-in-up">
                    <CardContent className="py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="bg-accent/10 border-border flex h-11 w-11 items-center justify-center border shadow-sm">
                            {item.type === "rewarded" ? (
                              <Coins className="h-5 w-5" />
                            ) : item.type === "completed" ? (
                              <Trophy className="h-5 w-5" />
                            ) : (
                              <History className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{getActivityLabel(item.type)}</p>
                              <Badge variant="secondary">{item.questName}</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                              {getActivityDescription(item)}
                            </p>
                            <p className="text-muted-foreground mt-2 text-xs font-bold">
                              {formatActivityDate(item.timestamp)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                          {item.amount !== undefined && (
                            <Badge variant="success" className="tabular-nums">
                              +{formatTokens(item.amount, 7, "USDC")}
                            </Badge>
                          )}
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2"
                          >
                            View transaction
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {capReached && (
                  <div className="text-muted-foreground mt-6 text-center text-sm font-bold">
                    Showing first 500 items — refine filters to see more
                  </div>
                )}

                {nextActivityCursor && !capReached && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() => void handleLoadMoreActivity()}
                      disabled={activityLoading}
                    >
                      {activityLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Profile Activity</h1>
            <p className="text-muted-foreground text-sm font-bold">
              Track aggregate rewards and recent wallet actions.
            </p>
          </div>
          <div className="border-border flex gap-0 border shadow-md">
            {(["overview", "activity"] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-border cursor-pointer border-r px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-colors last:border-r-0 ${
                  activeTab === tab ? "bg-accent" : "bg-background hover:bg-secondary"
                }`}
              >
                {tab === "overview" ? "View overview" : "View activity"}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-4">
            {earningsLoading ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <div className="bg-accent border-border mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <h3 className="mb-2 font-semibold">Loading on-chain earnings</h3>
                  <p className="text-muted-foreground text-sm">
                    Fetching your aggregate rewards from the rewards contract.
                  </p>
                </CardContent>
              </Card>
            ) : earningsError ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <div className="bg-destructive/10 border-destructive mb-4 flex h-14 w-14 items-center justify-center border shadow-md">
                    <AlertCircle className="text-destructive h-6 w-6" />
                  </div>
                  <h3 className="mb-2 font-semibold">On-chain earnings unavailable</h3>
                  <p className="text-muted-foreground max-w-md text-sm">{earningsError}</p>
                </CardContent>
              </Card>
            ) : totalEarned === 0n ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <div className="mb-6">
                    <img
                      src="/illustrations/empty-profile.svg"
                      alt=""
                      className="h-32 w-32 sm:h-40 sm:w-40"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mb-2 font-semibold">No on-chain earnings yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Your wallet has not received rewards from the rewards contract yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="animate-fade-in-up">
                <CardContent className="py-10">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-success/10 border-border flex h-12 w-12 shrink-0 items-center justify-center border-2 shadow-sm">
                        <Coins className="text-success h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">On-chain earnings total</p>
                        <p className="text-muted-foreground mt-1 max-w-md text-sm">
                          Aggregate rewards are read from the rewards contract. Use the Activity tab
                          to inspect recent enrollments, completions, and payouts sourced from
                          Horizon.
                        </p>
                      </div>
                    </div>
                    <Badge variant="success" className="self-start tabular-nums">
                      +{formattedEarned}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-accent border-border flex h-12 w-12 items-center justify-center border shadow-md">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Wallet timeline</h3>
                    <p className="text-muted-foreground text-sm">
                      Loaded from `VITE_HORIZON_URL` with direct transaction links.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border font-bold">
                  {activityItems.length} loaded
                </Badge>
              </CardContent>
            </Card>

            {activityLoading && activityItems.length === 0 ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Loader2 className="text-accent mb-4 h-8 w-8 animate-spin" />
                  <h3 className="mb-2 font-semibold">Loading activity</h3>
                  <p className="text-muted-foreground text-sm">
                    Fetching recent wallet operations from Horizon.
                  </p>
                </CardContent>
              </Card>
            ) : activityError ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <AlertCircle className="text-destructive mb-4 h-8 w-8" />
                  <h3 className="mb-2 font-semibold">Could not load activity</h3>
                  <p className="text-muted-foreground max-w-md text-sm">{activityError}</p>
                </CardContent>
              </Card>
            ) : activityItems.length === 0 ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <History className="text-muted-foreground mb-4 h-8 w-8" />
                  <h3 className="mb-2 font-semibold">No wallet activity yet</h3>
                  <p className="text-muted-foreground max-w-md text-sm">
                    Enroll in a quest or complete a milestone to start building your on-chain
                    timeline.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {activityItems.map(item => (
                  <Card key={item.id} className="animate-fade-in-up">
                    <CardContent className="py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="bg-accent/10 border-border flex h-11 w-11 items-center justify-center border shadow-sm">
                            {item.type === "rewarded" ? (
                              <Coins className="h-5 w-5" />
                            ) : item.type === "completed" ? (
                              <Trophy className="h-5 w-5" />
                            ) : (
                              <History className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{getActivityLabel(item.type)}</p>
                              <Badge variant="secondary">{item.questName}</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                              {getActivityDescription(item)}
                            </p>
                            <p className="text-muted-foreground mt-2 text-xs font-bold">
                              {formatActivityDate(item.timestamp)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                          {item.amount !== undefined && (
                            <Badge variant="success" className="tabular-nums">
                              +{formatTokens(item.amount, 7, "USDC")}
                            </Badge>
                          )}
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2"
                          >
                            View transaction
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {nextActivityCursor && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() => void handleLoadMoreActivity()}
                      disabled={activityLoading}
                    >
                      {activityLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Creator Dashboard (Issue #354) */}
      <div className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Creator Dashboard</h2>
            <Badge className="bg-accent text-primary-foreground border-border border-2 font-bold shadow-sm">
              Beta
            </Badge>
          </div>
          <span className="text-muted-foreground text-sm font-bold">Manage your quests</span>
        </div>

        {statsLoading ? (
          <Card className="animate-fade-in-up border shadow-xl">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin" />
              <h3 className="text-lg font-semibold">Loading creator statistics</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Scanning the ledger for your quests and calculating active reward pools...
              </p>
            </CardContent>
          </Card>
        ) : statsError ? (
          <Card className="animate-fade-in-up border-destructive border shadow-xl">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="text-destructive mb-4 h-10 w-10" />
              <h3 className="text-lg font-semibold">Failed to load statistics</h3>
              <p className="text-muted-foreground max-w-sm text-sm">{statsError}</p>
            </CardContent>
          </Card>
        ) : !creatorStats || creatorStats.totalQuests === 0 ? (
          <Card className="animate-fade-in-up border border-dashed shadow-xl">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="bg-secondary mb-4 flex h-16 w-16 items-center justify-center border-2 border-dashed">
                <Target className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="text-muted-foreground text-lg font-semibold">No quests created yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                You haven't launched any quests on Lernza. Start sharing your knowledge and
                incentivizing learners today.
              </p>
              <Button variant="outline" className="border-border border font-bold">
                Learn how to create
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="animate-fade-in-up stagger-1 space-y-6">
            {/* Creator Overview Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="bg-accent/5 border-border border shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent border-border flex h-10 w-10 items-center justify-center border-2">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-bold uppercase">
                        Quests Created
                      </p>
                      <p className="text-2xl font-semibold">{creatorStats.totalQuests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-success/5 border-border border shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-success border-border flex h-10 w-10 items-center justify-center border-2">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-bold uppercase">
                        Total Enrollees
                      </p>
                      <p className="text-2xl font-semibold">{creatorStats.totalEnrollees}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-warning/5 border-border border shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border-2">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-bold uppercase">
                        Active Pool Total
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatTokens(Number(creatorStats.totalPoolBalance))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Individual Quests List */}
            <div className="space-y-4">
              <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Your Quests
              </h3>
              {creatorStats.quests.map(quest => (
                <Card
                  key={quest.id}
                  className="bg-card hover:bg-secondary/50 border-border group border shadow-md transition-colors"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="decoration-accent truncate text-lg font-semibold decoration-4 underline-offset-4 transition-colors group-hover:underline">
                            {quest.name}
                          </h4>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">
                            ID: {quest.id}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                          {quest.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-background border-border flex items-center gap-2 border px-3 py-1.5">
                          <Users className="text-muted-foreground h-3.5 w-3.5" />
                          <span className="text-sm font-bold">{quest.enrolleesCount}</span>
                        </div>
                        <div className="bg-background border-border flex min-w-[100px] items-center gap-2 border px-3 py-1.5">
                          <Coins className="text-success h-3.5 w-3.5" />
                          <span className="text-sm font-bold tabular-nums">
                            {formatTokens(Number(quest.poolBalance))} USDC
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="font-bold shadow-sm"
                          onClick={() => navigateToPath(`/quest/${quest.id}`)}
                          aria-label={`Open quest ${quest.name}`}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
