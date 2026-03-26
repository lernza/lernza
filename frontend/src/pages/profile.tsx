import {
  Wallet,
  Coins,
  TrendingUp,
  Trophy,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { useContractData } from "@/hooks/use-async-data"
import { formatTokens } from "@/lib/utils"
import { rewardsClient } from "@/lib/contracts/rewards"
import { SkeletonEarningsList, SkeletonStatsRow } from "@/components/ui/skeleton"

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
                {earningsLoading ? (
                  <SkeletonStatsRow className="grid-cols-1 sm:grid-cols-1 w-36" />
                ) : (
                  <div className="bg-primary border-border border-2 px-5 py-3 shadow-[3px_3px_0_var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <p className="text-2xl font-black tabular-nums">{formattedEarned}</p>
                    </div>
                    <p className="text-xs font-bold">USDC earned on-chain</p>
                  </div>
                )}
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
            <SkeletonEarningsList count={3} />
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
    </div>
  )
}
