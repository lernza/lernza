import {
  History as HistoryIcon,
  ExternalLink,
  Loader2,
  AlertCircle,
  Filter,
  Calendar,
  Coins,
  Trophy,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { fetchWalletActivity, type WalletActivityItem } from "@/lib/horizon-activity"
import { formatTokens } from "@/lib/utils"

function formatHistoryDate(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function getActivityIcon(type: WalletActivityItem["type"]) {
  switch (type) {
    case "rewarded":
      return <Coins className="h-5 w-5" />
    case "completed":
      return <Trophy className="h-5 w-5" />
    default:
      return <HistoryIcon className="h-5 w-5" />
  }
}

function getActivityBadgeVariant(type: WalletActivityItem["type"]) {
  switch (type) {
    case "enrolled":
      return "secondary"
    case "completed":
      return "default"
    case "rewarded":
      return "success"
    case "left":
      return "destructive"
  }
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
      return "Left"
  }
}

function getActivityDescription(item: WalletActivityItem) {
  switch (item.type) {
    case "enrolled":
      return `You joined ${item.questName}`
    case "completed":
      return `Milestone completed in ${item.questName}`
    case "rewarded":
      return `Reward distributed from ${item.questName}`
    case "left":
      return `You left ${item.questName}`
  }
}

export function History() {
  const { connected, connect, address, loading: walletConnecting } = useWallet()
  const [historyItems, setHistoryItems] = useState<WalletActivityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [capReached, setCapReached] = useState(false)
  const [filterType, setFilterType] = useState<WalletActivityItem["type"] | "all">("all")

  useEffect(() => {
    if (!connected || !address) {
      return
    }

    const controller = new AbortController()

    const loadInitialHistory = async () => {
      setHistoryItems([])
      setNextCursor(null)
      setCapReached(false)
      setLoading(true)
      setError(null)

      try {
        const page = await fetchWalletActivity(address, null, 0, controller.signal)
        if (controller.signal.aborted) return

        setHistoryItems(page.items)
        setNextCursor(page.nextCursor)
        setCapReached(page.capReached)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "Failed to load history.")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadInitialHistory()

    return () => {
      controller.abort()
    }
  }, [connected, address])

  const handleLoadMore = async (signal?: AbortSignal) => {
    if (!address || !nextCursor || loading) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const page = await fetchWalletActivity(address, nextCursor, historyItems.length, signal)
      if (signal?.aborted) return
      setHistoryItems(current => [...current, ...page.items])
      setNextCursor(page.nextCursor)
      setCapReached(page.capReached)
    } catch (err) {
      if (signal?.aborted) return
      setError(err instanceof Error ? err.message : "Failed to load more history.")
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  const filteredItems = historyItems.filter(
    item => filterType === "all" || item.type === filterType
  )

  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-lg px-4">
          <div className="bg-card text-card-foreground border-border animate-scale-in overflow-hidden border shadow-xl">
            <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
              <span className="text-xs font-semibold tracking-wider uppercase">
                Transaction History
              </span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>
            <div className="p-8 text-center sm:p-10">
              <div className="bg-accent border-border animate-fade-in-up mx-auto mb-6 flex h-20 w-20 items-center justify-center border shadow-md">
                <HistoryIcon className="h-8 w-8" />
              </div>
              <h1 className="animate-fade-in-up stagger-1 mb-3 text-2xl font-semibold sm:text-3xl">
                View your history
              </h1>
              <p className="text-muted-foreground animate-fade-in-up stagger-2 mx-auto mb-8 max-w-sm">
                Connect your Freighter wallet to see all your on-chain quest interactions,
                enrollments, and rewards.
              </p>
              <Button
                size="lg"
                onClick={connect}
                disabled={walletConnecting}
                className="shimmer-on-hover animate-fade-in-up stagger-3"
              >
                {walletConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <HistoryIcon className="h-4 w-4" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Header */}
      <div className="animate-fade-in-up relative mb-8">
        <div className="bg-accent border-border overflow-hidden border shadow-lg">
          <div className="relative h-20 sm:h-28">
            <div
              className="bg-foreground/5 border-foreground/10 animate-float absolute top-3 right-6 h-10 w-10 rotate-12 border-2"
              style={{ animationDuration: "7s" }}
            />
          </div>

          <div className="bg-card text-card-foreground border-border relative border-t px-6 py-6 sm:py-8">
            <div className="-mt-12 sm:-mt-16">
              <div className="flex items-start gap-4">
                <div className="bg-accent border-border flex h-16 w-16 shrink-0 items-center justify-center border-2 shadow-md">
                  <HistoryIcon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold sm:text-3xl">Transaction History</h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    View all your on-chain quest interactions and reward distributions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="animate-fade-in-up relative mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-semibold">Filter by:</span>
          </div>
          <div className="border-border flex gap-0 border shadow-md">
            {(["all", "enrolled", "completed", "rewarded", "left"] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`border-border cursor-pointer border-r px-3 py-2 text-xs font-semibold uppercase transition-colors last:border-r-0 ${
                  filterType === type ? "bg-accent" : "bg-background hover:bg-secondary"
                }`}
              >
                {type === "all" ? "All" : getActivityLabel(type)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading && historyItems.length === 0 ? (
          <Card className="animate-fade-in-up">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Loader2 className="text-accent mb-4 h-8 w-8 animate-spin" />
              <h3 className="mb-2 font-semibold">Loading transaction history</h3>
              <p className="text-muted-foreground text-sm">
                Fetching your on-chain interactions from Horizon.
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="animate-fade-in-up">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="text-destructive mb-4 h-8 w-8" />
              <h3 className="mb-2 font-semibold">Could not load history</h3>
              <p className="text-muted-foreground max-w-md text-sm">{error}</p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="animate-fade-in-up">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Calendar className="text-muted-foreground mb-4 h-8 w-8" />
              <h3 className="mb-2 font-semibold">
                {filterType === "all"
                  ? "No transactions yet"
                  : `No ${getActivityLabel(filterType).toLowerCase()} transactions`}
              </h3>
              <p className="text-muted-foreground max-w-md text-sm">
                Your on-chain quest interactions will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredItems.map(item => (
              <Card key={item.id} className="animate-fade-in-up">
                <CardContent className="py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-accent/10 border-border flex h-11 w-11 items-center justify-center border shadow-sm">
                        {getActivityIcon(item.type)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getActivityBadgeVariant(item.type)}>
                            {getActivityLabel(item.type)}
                          </Badge>
                          <Badge variant="secondary">{item.questName}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">
                          {getActivityDescription(item)}
                        </p>
                        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs font-bold">
                          <Calendar className="h-3 w-3" />
                          {formatHistoryDate(item.timestamp)}
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
                        View on Stellar Explorer
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

            {nextCursor && !capReached && (
              <div className="flex justify-center pt-4">
                <Button onClick={() => void handleLoadMore()} disabled={loading}>
                  {loading ? (
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
  )
}
