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
  // Generate a grid of colored blocks from the address
  const colors = ["#FACC15", "#22C55E", "#000000", "#F5F5F4", "#FFFFFF"]
  const cells = Array.from({ length: 16 }, (_, i) => {
    const charCode = address.charCodeAt(i % address.length) || 0
    return colors[charCode % colors.length]
  })

  return (
    <div className="grid h-20 w-20 flex-shrink-0 grid-cols-4 overflow-hidden border-[3px] border-black shadow-[4px_4px_0_#000]">
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
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        {/* Background elements */}
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div
          className="bg-primary animate-float absolute top-[12%] right-[7%] h-20 w-20 rotate-12 border-[3px] border-black opacity-[0.08] shadow-[4px_4px_0_#000]"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="bg-success animate-float absolute bottom-[18%] left-[5%] h-14 w-14 -rotate-6 border-[2px] border-black opacity-[0.07] shadow-[3px_3px_0_#000]"
          style={{ animationDuration: "6s", animationDelay: "1s" }}
        />
        <div
          className="bg-primary animate-float absolute top-[55%] right-[4%] h-10 w-10 rotate-45 border-[2px] border-black opacity-[0.06] shadow-[2px_2px_0_#000]"
          style={{ animationDuration: "7s", animationDelay: "2s" }}
        />

        <div className="relative mx-auto max-w-lg px-4">
          <div className="animate-scale-in overflow-hidden border-[3px] border-black bg-white shadow-[8px_8px_0_#000]">
            <div className="bg-primary flex items-center justify-between border-b-[3px] border-black px-6 py-3">
              <span className="text-xs font-black tracking-wider uppercase">Profile</span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive h-2.5 w-2.5 border border-black" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>

            <div className="p-8 text-center sm:p-10">
              <div className="bg-primary animate-fade-in-up mx-auto mb-6 flex h-20 w-20 items-center justify-center border-[3px] border-black shadow-[4px_4px_0_#000]">
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

              <div className="animate-fade-in-up stagger-4 mt-8 border-t-[2px] border-black pt-6">
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Trophy, text: "View achievements" },
                    { icon: Coins, text: "Track earnings" },
                    { icon: TrendingUp, text: "See progress" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2">
                      <div className="bg-secondary flex h-6 w-6 items-center justify-center border-[1.5px] border-black">
                        <item.icon className="h-3 w-3" />
                      </div>
                      <span className="text-muted-foreground text-xs font-bold">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary animate-fade-in-up stagger-5 absolute -top-4 -right-4 hidden h-10 w-10 rotate-12 border-[2px] border-black shadow-[3px_3px_0_#000] sm:block" />
          <div className="bg-success animate-fade-in-up stagger-6 absolute -bottom-3 -left-3 hidden h-8 w-8 -rotate-6 border-[2px] border-black shadow-[2px_2px_0_#000] sm:block" />
        </div>
      </div>
    )
  }

  const earnings = [
    {
      milestone: "Hello World",
      workspace: "Learn to Code with Alex",
      amount: 50,
      date: "2 days ago",
    },
    {
      milestone: "Build a CLI Tool",
      workspace: "Learn to Code with Alex",
      amount: 100,
      date: "5 days ago",
    },
    {
      milestone: "Set up Stellar CLI",
      workspace: "Stellar Dev Bootcamp",
      amount: 100,
      date: "1 week ago",
    },
    {
      milestone: "First Soroban Contract",
      workspace: "Stellar Dev Bootcamp",
      amount: 200,
      date: "2 weeks ago",
    },
  ]

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Background */}
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Profile header with accent banner */}
      <div className="animate-fade-in-up relative mb-8">
        {/* Yellow banner background */}
        <div className="bg-primary overflow-hidden border-[3px] border-black shadow-[6px_6px_0_#000]">
          <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-20" />

          {/* Banner top section */}
          <div className="relative h-20 sm:h-28">
            {/* Floating shapes in banner */}
            <div
              className="animate-float absolute top-3 right-6 h-10 w-10 rotate-12 border-[2px] border-black/10 bg-black/5"
              style={{ animationDuration: "7s" }}
            />
            <div
              className="animate-float absolute right-24 bottom-2 h-6 w-6 -rotate-6 border-[2px] border-black/10 bg-black/5"
              style={{ animationDuration: "5s", animationDelay: "1s" }}
            />
          </div>

          {/* Profile info - overlaps the banner */}
          <div className="relative border-t-[3px] border-black bg-white px-6 py-5">
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
                  <p className="text-muted-foreground max-w-[200px] truncate font-mono text-sm font-bold sm:max-w-xs">
                    {address}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="neo-press hover:bg-secondary flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center border-[2px] border-black bg-white shadow-[2px_2px_0_#000]"
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
                <div className="bg-primary border-[2px] border-black px-5 py-3 shadow-[3px_3px_0_#000]">
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
                <div className="bg-primary mb-4 flex h-14 w-14 items-center justify-center border-[3px] border-black shadow-[4px_4px_0_#000]">
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
                <Card className="neo-lift group hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Earning amount circle */}
                        <div className="bg-success/10 group-hover:bg-success/20 flex h-12 w-12 flex-shrink-0 items-center justify-center border-[2px] border-black shadow-[2px_2px_0_#000] transition-colors">
                          <Coins className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <p className="text-sm font-black">{e.milestone}</p>
                          <p className="text-muted-foreground text-xs font-bold">{e.workspace}</p>
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
