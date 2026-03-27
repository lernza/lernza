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
  Target,
  Users,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { useContractData } from "@/hooks/use-async-data"
import { useUserRole } from "@/hooks/use-user-role"
import { formatTokens } from "@/lib/utils"
import { rewardsClient } from "@/lib/contracts/rewards"
import { questClient } from "@/lib/contracts/quest"

/* ─── Generated Avatar from wallet address ─── */

function WalletAvatar({ address }: { address: string }) {
  // Generate a grid of colored blocks from the address
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
  const [copied, setCopied] = useState(false)
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
      const allQuests = await questClient.getQuests()
      const ownedQuests = allQuests.filter(q => q.owner === address)

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
          } catch (err) {
            console.error(`Failed to fetch stats for quest ${q.id}:`, err)
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

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formattedEarned =
    totalEarned === null
      ? "Unavailable"
      : totalEarned > BigInt(Number.MAX_SAFE_INTEGER)
        ? totalEarned.toString()
        : formatTokens(Number(totalEarned))

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
                  <h2 className="text-xl font-black">{getRoleLabel()}</h2>
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
                    className="border-border bg-card neo-press hover:bg-secondary flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-2 shadow-[2px_2px_0_var(--color-border)]"
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
                <div className="bg-primary border-border border-2 px-5 py-3 shadow-[3px_3px_0_var(--color-border)]">
                  <div className="flex items-center gap-2">
                    {earningsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <p className="text-2xl font-black tabular-nums">{formattedEarned}</p>
                  </div>
                  <p className="text-xs font-bold">
                    {earningsLoading ? "Loading on-chain earnings" : "USDC earned on-chain"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings history */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">Earnings History</h2>
          <span className="text-muted-foreground text-sm font-bold">Aggregate total only</span>
        </div>

        <div className="space-y-4">
          {earningsLoading ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-primary border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <h3 className="mb-2 font-black">Loading on-chain earnings</h3>
                <p className="text-muted-foreground text-sm">
                  Fetching your aggregate rewards from the rewards contract.
                </p>
              </CardContent>
            </Card>
          ) : earningsError ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-destructive/10 border-destructive mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                  <AlertCircle className="text-destructive h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">On-chain earnings unavailable</h3>
                <p className="text-muted-foreground max-w-md text-sm">{earningsError}</p>
              </CardContent>
            </Card>
          ) : totalEarned === 0n ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-primary border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">No on-chain earnings yet</h3>
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
                    <div className="bg-success/10 border-border flex h-12 w-12 shrink-0 items-center justify-center border-2 shadow-[2px_2px_0_var(--color-border)]">
                      <Coins className="text-success h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black">On-chain earnings total</p>
                      <p className="text-muted-foreground mt-1 max-w-md text-sm">
                        The rewards contract exposes your aggregate earnings by wallet address.
                        Per-milestone payout history is not indexable from the current on-chain API
                        yet, so this page does not fabricate transactions.
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="self-start tabular-nums">
                    +{formattedEarned} USDC
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Creator Dashboard (Issue #354) */}
      <div className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black">Creator Dashboard</h2>
            <Badge variant="outline" className="border-primary text-primary border-[2px] font-bold">
              Beta
            </Badge>
          </div>
          <span className="text-muted-foreground text-sm font-bold">Manage your quests</span>
        </div>

        {statsLoading ? (
          <Card className="animate-fade-in-up border-[3px] shadow-[8px_8px_0_var(--color-border)]">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Loader2 className="text-primary mb-4 h-10 w-10 animate-spin" />
              <h3 className="text-lg font-black">Loading creator statistics</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Scanning the ledger for your quests and calculating active reward pools...
              </p>
            </CardContent>
          </Card>
        ) : statsError ? (
          <Card className="animate-fade-in-up border-destructive border-[3px] shadow-[8px_8px_0_var(--color-border)]">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="text-destructive mb-4 h-10 w-10" />
              <h3 className="text-lg font-black">Failed to load statistics</h3>
              <p className="text-muted-foreground max-w-sm text-sm">{statsError}</p>
            </CardContent>
          </Card>
        ) : !creatorStats || creatorStats.totalQuests === 0 ? (
          <Card className="animate-fade-in-up border-[3px] border-dashed shadow-[8px_8px_0_rgba(0,0,0,0.1)]">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="bg-secondary mb-4 flex h-16 w-16 items-center justify-center border-2 border-dashed">
                <Target className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="text-muted-foreground text-lg font-black">No quests created yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                You haven't launched any quests on Lernza. Start sharing your knowledge and
                incentivizing learners today.
              </p>
              <Button variant="outline" className="border-[2px] border-black font-bold">
                Learn how to create
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="animate-fade-in-up stagger-1 space-y-6">
            {/* Creator Overview Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="bg-primary/5 border-border border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary border-border flex h-10 w-10 items-center justify-center border-2">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-bold uppercase">
                        Quests Created
                      </p>
                      <p className="text-2xl font-black">{creatorStats.totalQuests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-success/5 border-border border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-success border-border flex h-10 w-10 items-center justify-center border-2">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-bold uppercase">
                        Total Enrollees
                      </p>
                      <p className="text-2xl font-black">{creatorStats.totalEnrollees}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-warning/5 border-border border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border-2">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-bold uppercase">
                        Active Pool Total
                      </p>
                      <p className="text-2xl font-black tabular-nums">
                        {formatTokens(Number(creatorStats.totalPoolBalance))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Individual Quests List */}
            <div className="space-y-4">
              <h3 className="text-muted-foreground text-sm font-black tracking-wider uppercase">
                Your Quests
              </h3>
              {creatorStats.quests.map(quest => (
                <Card
                  key={quest.id}
                  className="bg-card hover:bg-secondary/50 border-border group border-[3px] shadow-[4px_4px_0_var(--color-border)] transition-colors"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="group-hover:text-primary truncate text-lg font-black transition-colors">
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
                        <div className="bg-background border-border flex items-center gap-2 border-[2px] px-3 py-1.5">
                          <Users className="text-muted-foreground h-3.5 w-3.5" />
                          <span className="text-sm font-bold">{quest.enrolleesCount}</span>
                        </div>
                        <div className="bg-background border-border flex min-w-[100px] items-center gap-2 border-[2px] px-3 py-1.5">
                          <Coins className="text-success h-3.5 w-3.5" />
                          <span className="text-sm font-bold tabular-nums">
                            {formatTokens(Number(quest.poolBalance))} USDC
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="font-bold shadow-[2px_2px_0_#000]"
                          onClick={() => (window.location.href = `/quest/${quest.id}`)}
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
