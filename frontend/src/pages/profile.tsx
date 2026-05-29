import {
  Wallet,
  Coins,
  TrendingUp,
  Trophy,
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  History,
  ExternalLink,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { MOCK_USER_STATS } from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"
import { fetchWalletActivity, type WalletActivityItem } from "@/lib/horizon-activity"

type ProfileTab = "overview" | "activity"

/* ─── Helper functions for activity display ─── */

function getActivityLabel(type: WalletActivityItem["type"]): string {
  switch (type) {
    case "rewarded":
      return "Reward Claimed"
    case "completed":
      return "Milestone Completed"
    case "enrolled":
      return "Quest Enrolled"
    default:
      return "Activity"
  }
}

function getActivityDescription(item: WalletActivityItem): string {
  if (item.type === "rewarded") {
    return `You earned ${formatTokens(item.amount || 0n, 7, "USDC")} for completing a milestone.`
  }
  if (item.type === "completed") {
    return `You completed a milestone in ${item.questName}.`
  }
  if (item.type === "enrolled") {
    return `You enrolled in ${item.questName}.`
  }
  return "Wallet activity"
}

function formatActivityDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/* ─── Generated Avatar from wallet address ─── */

function WalletAvatar({ address }: { address: string }) {
  const colors = ["#FACC15", "#22C55E", "#000000", "#F5F5F4", "#FFFFFF"]
  const cells = Array.from({ length: 16 }, (_, i) => {
    const charCode = address.charCodeAt(i % address.length) || 0
    return colors[charCode % colors.length]
  })

  return (
    <div className="border-border grid h-20 w-20 shrink-0 grid-cols-4 overflow-hidden border-[3px] shadow-[4px_4px_0_var(--color-border)]">
      {cells.map((color, i) => (
        <div key={i} style={{ backgroundColor: color }} />
      ))}
    </div>
  )
}

export function Profile() {
  const { connected, connect, address } = useWallet()
  const stats = MOCK_USER_STATS
  const [copied, setCopied] = useState(false)
  const [activeTab] = useState<ProfileTab>("overview")
  const [activityItems, setActivityItems] = useState<WalletActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [nextActivityCursor, setNextActivityCursor] = useState<string | null>(null)
  const [capReached, setCapReached] = useState(false)

  useEffect(() => {
    setActivityItems([])
    setActivityError(null)
    setNextActivityCursor(null)
    setActivityLoading(false)
  }, [address, activeTab])

  useEffect(() => {
    if (!connected || !address || activeTab !== "activity" || activityItems.length > 0) {
      return
    }

    let cancelled = false

    const loadInitialActivity = async () => {
      setActivityLoading(true)
      setActivityError(null)

      try {
        const page = await fetchWalletActivity(address, undefined, 0)
        if (cancelled) return

        setActivityItems(page.items)
        setNextActivityCursor(page.nextCursor)
        setCapReached(page.capReached)
      } catch (error) {
        if (cancelled) return
        setActivityError(error instanceof Error ? error.message : "Failed to load activity.")
      } finally {
        if (!cancelled) {
          setActivityLoading(false)
        }
      }
    }

    void loadInitialActivity()

    return () => {
      cancelled = true
    }
  }, [activeTab, activityItems.length, address, connected])

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLoadMoreActivity = async () => {
    if (!address || !nextActivityCursor || activityLoading) {
      return
    }

    setActivityLoading(true)
    setActivityError(null)

    try {
      const page = await fetchWalletActivity(address, nextActivityCursor, activityItems.length)
      setActivityItems(current => [...current, ...page.items])
      setNextActivityCursor(page.nextCursor)
      setCapReached(page.capReached)
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : "Failed to load activity.")
    } finally {
      setActivityLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div
          className="bg-primary border-border animate-float absolute top-[12%] right-[7%] h-20 w-20 rotate-12 border-[3px] opacity-[0.08] shadow-[4px_4px_0_var(--color-border)]"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="bg-success border-border animate-float absolute bottom-[18%] left-[5%] h-14 w-14 -rotate-6 border-2 opacity-[0.07] shadow-[3px_3px_0_var(--color-border)]"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
        <div
          className="bg-primary border-border animate-float absolute top-[55%] right-[4%] h-10 w-10 rotate-45 border-2 opacity-[0.06] shadow-[2px_2px_0_var(--color-border)]"
          style={{ animationDuration: "7s", animationDelay: "2s" }}
        />

        <div className="relative mx-auto max-w-lg px-4">
          <div className="bg-card text-card-foreground border-border animate-scale-in overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
            <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
              <span className="text-xs font-black tracking-wider uppercase">Profile</span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>

            <div className="p-8 text-center sm:p-10">
              <div className="bg-primary border-border animate-fade-in-up mx-auto mb-6 flex h-20 w-20 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="animate-fade-in-up stagger-1 mb-3 text-2xl font-black sm:text-3xl">
                Connect your wallet
              </h2>
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

          <div className="bg-primary border-border animate-fade-in-up stagger-5 absolute -top-4 -right-4 hidden h-10 w-10 rotate-12 border-2 shadow-[3px_3px_0_var(--color-border)] sm:block" />
          <div className="bg-success border-border animate-fade-in-up stagger-6 absolute -bottom-3 -left-3 hidden h-8 w-8 -rotate-6 border-2 shadow-[2px_2px_0_var(--color-border)] sm:block" />
        </div>
      </div>
    )
  }

  const earnings = [
    {
      milestone: "Hello World",
      quest: "Learn to Code with Alex",
      amount: 50,
      date: "2 days ago",
    },
    {
      milestone: "Build a CLI Tool",
      quest: "Learn to Code with Alex",
      amount: 100,
      date: "5 days ago",
    },
    {
      milestone: "Set up Stellar CLI",
      quest: "Stellar Dev Bootcamp",
      amount: 100,
      date: "1 week ago",
    },
    {
      milestone: "First Soroban Contract",
      quest: "Stellar Dev Bootcamp",
      amount: 200,
      date: "2 weeks ago",
    },
  ]

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Profile header */}
      <div className="animate-fade-in-up relative mb-8">
        <div className="bg-primary border-border overflow-hidden border-[3px] shadow-[6px_6px_0_var(--color-border)]">
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
          <div className="bg-card text-card-foreground border-border relative border-t-[3px] px-6 py-5">
            <div className="-mt-14 flex flex-col items-start gap-6 sm:-mt-16 sm:flex-row sm:items-center">
              <WalletAvatar address={address || ""} />

              <div className="mt-2 min-w-0 flex-1 sm:mt-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black">Learner</h2>
                  <Badge variant="success" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-muted-foreground max-w-50 truncate font-mono text-sm font-bold sm:max-w-xs">
                    {address}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="border-border bg-card neo-press hover:bg-secondary flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-2 shadow-[2px_2px_0_var(--color-border)]"
                  >
                    {copied ? (
                      <Check className="text-success h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="sm:mt-6">
                <div className="bg-primary border-border border-2 px-5 py-3 shadow-[3px_3px_0_var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <p className="text-2xl font-black tabular-nums">
                      {formatTokens(stats.totalEarned)}
                    </p>
                  </div>
                  <p className="text-xs font-bold">USDC earned</p>
                </div>
                <Badge variant="outline" className="border-[2px] font-bold">
                  {activityItems.length} loaded
                </Badge>
              </div>
            </div>

            {activityLoading && activityItems.length === 0 ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
                  <h3 className="mb-2 font-black">Loading activity</h3>
                  <p className="text-muted-foreground text-sm">
                    Fetching recent wallet operations from Horizon.
                  </p>
                </CardContent>
              </Card>
            ) : activityError ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <AlertCircle className="text-destructive mb-4 h-8 w-8" />
                  <h3 className="mb-2 font-black">Could not load activity</h3>
                  <p className="text-muted-foreground max-w-md text-sm">{activityError}</p>
                </CardContent>
              </Card>
            ) : activityItems.length === 0 ? (
              <Card className="animate-fade-in-up">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <History className="text-muted-foreground mb-4 h-8 w-8" />
                  <h3 className="mb-2 font-black">No wallet activity yet</h3>
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
                          <div className="bg-primary/10 border-border flex h-11 w-11 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)]">
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
                              <p className="font-black">{getActivityLabel(item.type)}</p>
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
                            className="text-primary inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2"
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

      {/* Earnings history */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">Earnings History</h2>
          <span className="text-muted-foreground text-sm font-bold">
            {earnings.length} transactions
          </span>
        </div>

        <div className="space-y-4">
          {earnings.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-primary border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">No earnings yet</h3>
                <p className="text-muted-foreground text-sm">
                  Complete milestones to start earning USDC.
                </p>
              </CardContent>
            </Card>
          ) : (
            earnings.map((e, i) => (
              <div key={i} className={`animate-fade-in-up stagger-${i + 1}`}>
                <Card className="neo-lift group hover:shadow-[7px_7px_0_var(--color-border)] active:shadow-[2px_2px_0_var(--color-border)]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-success/10 border-border group-hover:bg-success/20 flex h-12 w-12 shrink-0 items-center justify-center border-2 shadow-[2px_2px_0_var(--color-border)] transition-colors">
                          <Coins className="text-success h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black">{e.milestone}</p>
                          <p className="text-muted-foreground text-xs font-bold">{e.quest}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <Badge variant="success" className="tabular-nums">
                          +{e.amount} USDC
                        </Badge>
                        <p className="text-muted-foreground text-xs font-bold">{e.date}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
