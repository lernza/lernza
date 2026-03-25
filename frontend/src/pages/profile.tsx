import { Wallet, Coins, TrendingUp, Trophy, Sparkles, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { MOCK_USER_STATS } from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"

/* ─── Generated Avatar from wallet address ─── */

function WalletAvatar({ address }: { address: string }) {
  const colors = ["#FACC15", "#22C55E", "#000000", "#F5F5F4", "#FFFFFF"]
  const cells = Array.from({ length: 16 }, (_, i) => {
    const charCode = address.charCodeAt(i % address.length) || 0
    return colors[charCode % colors.length]
  })

  return (
    <div className="w-20 h-20 border-[3px] border-border shadow-[4px_4px_0_var(--color-border)] grid grid-cols-4 overflow-hidden shrink-0">
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

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-[calc(100vh-67px)] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots pointer-events-none" />
        <div className="absolute top-[12%] right-[7%] w-20 h-20 bg-primary border-[3px] border-border shadow-[4px_4px_0_var(--color-border)] rotate-12 opacity-[0.08] animate-float" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[18%] left-[5%] w-14 h-14 bg-success border-2 border-border shadow-[3px_3px_0_var(--color-border)] -rotate-6 opacity-[0.07] animate-float" style={{ animationDuration: "6s", animationDelay: "1s" }} />
        <div className="absolute top-[55%] right-[4%] w-10 h-10 bg-primary border-2 border-border shadow-[2px_2px_0_var(--color-border)] rotate-45 opacity-[0.06] animate-float" style={{ animationDuration: "7s", animationDelay: "2s" }} />

        <div className="relative px-4 max-w-lg mx-auto">
          <div className="bg-card text-card-foreground border-[3px] border-border shadow-[8px_8px_0_var(--color-border)] overflow-hidden animate-scale-in">
            <div className="bg-primary border-b-[3px] border-border px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Profile</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-destructive border border-border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>

            <div className="p-8 sm:p-10 text-center">
              <div className="w-20 h-20 bg-primary border-[3px] border-border shadow-[4px_4px_0_var(--color-border)] flex items-center justify-center mb-6 mx-auto animate-fade-in-up">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-3 animate-fade-in-up stagger-1">
                Connect your wallet
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto animate-fade-in-up stagger-2">
                Connect your Freighter wallet to view your profile, track earnings, and see your quest history.
              </p>
              <Button size="lg" onClick={connect} className="shimmer-on-hover animate-fade-in-up stagger-3">
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>

              <div className="mt-8 pt-6 border-t-2 border-border animate-fade-in-up stagger-4">
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Trophy, text: "View achievements" },
                    { icon: Coins, text: "Track earnings" },
                    { icon: TrendingUp, text: "See progress" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-secondary border-[1.5px] border-border flex items-center justify-center">
                        <item.icon className="h-3 w-3" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -top-4 -right-4 w-10 h-10 bg-primary border-2 border-border shadow-[3px_3px_0_var(--color-border)] rotate-12 animate-fade-in-up stagger-5 hidden sm:block" />
          <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-success border-2 border-border shadow-[2px_2px_0_var(--color-border)] -rotate-6 animate-fade-in-up stagger-6 hidden sm:block" />
        </div>
      </div>
    )
  }

  const earnings = [
    { milestone: "Hello World", workspace: "Learn to Code with Alex", amount: 50, date: "2 days ago" },
    { milestone: "Build a CLI Tool", workspace: "Learn to Code with Alex", amount: 100, date: "5 days ago" },
    { milestone: "Set up Stellar CLI", workspace: "Stellar Dev Bootcamp", amount: 100, date: "1 week ago" },
    { milestone: "First Soroban Contract", workspace: "Stellar Dev Bootcamp", amount: 200, date: "2 weeks ago" },
  ]

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-30" />

      {/* Profile header */}
      <div className="relative mb-8 animate-fade-in-up">
        <div className="bg-primary border-[3px] border-border shadow-[6px_6px_0_var(--color-border)] overflow-hidden">
          <div className="absolute inset-0 bg-diagonal-lines opacity-20 pointer-events-none" />

          {/* Banner */}
          <div className="h-20 sm:h-28 relative">
            <div className="absolute top-3 right-6 w-10 h-10 bg-foreground/5 border-2 border-foreground/10 rotate-12 animate-float" style={{ animationDuration: "7s" }} />
            <div className="absolute bottom-2 right-24 w-6 h-6 bg-foreground/5 border-2 border-foreground/10 -rotate-6 animate-float" style={{ animationDuration: "5s", animationDelay: "1s" }} />
          </div>

          {/* Profile info */}
          <div className="bg-card text-card-foreground border-t-[3px] border-border px-6 py-5 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 -mt-14 sm:-mt-16">
              <WalletAvatar address={address || ""} />

              <div className="flex-1 min-w-0 mt-2 sm:mt-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black">Learner</h2>
                  <Badge variant="success" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-sm text-muted-foreground font-bold truncate max-w-50 sm:max-w-xs">
                    {address}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="w-7 h-7 border-2 border-border bg-card shadow-[2px_2px_0_var(--color-border)] flex items-center justify-center neo-press hover:bg-secondary shrink-0 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="sm:mt-6">
                <div className="bg-primary border-2 border-border shadow-[3px_3px_0_var(--color-border)] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <p className="text-2xl font-black tabular-nums">
                      {formatTokens(stats.totalEarned)}
                    </p>
                  </div>
                  <p className="text-xs font-bold">USDC earned</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings history */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black">Earnings History</h2>
          <span className="text-sm font-bold text-muted-foreground">
            {earnings.length} transactions
          </span>
        </div>

        <div className="space-y-4">
          {earnings.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 bg-primary border-[3px] border-border shadow-[4px_4px_0_var(--color-border)] flex items-center justify-center mb-4">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="font-black mb-2">No earnings yet</h3>
                <p className="text-sm text-muted-foreground">
                  Complete milestones to start earning USDC.
                </p>
              </CardContent>
            </Card>
          ) : (
            earnings.map((e, i) => (
              <div key={i} className={`animate-fade-in-up stagger-${i + 1}`}>
                <Card className="neo-lift hover:shadow-[7px_7px_0_var(--color-border)] active:shadow-[2px_2px_0_var(--color-border)] group">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success/10 border-2 border-border shadow-[2px_2px_0_var(--color-border)] flex items-center justify-center shrink-0 group-hover:bg-success/20 transition-colors">
                          <Coins className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="font-black text-sm">{e.milestone}</p>
                          <p className="text-xs font-bold text-muted-foreground">{e.workspace}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <Badge variant="success" className="tabular-nums">
                          +{e.amount} USDC
                        </Badge>
                        <p className="text-xs font-bold text-muted-foreground">{e.date}</p>
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