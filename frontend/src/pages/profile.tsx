import { Wallet, Coins, Target, Trophy, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { MOCK_USER_STATS } from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"

export function Profile() {
  const { connected, connect, shortAddress, address } = useWallet()
  const stats = MOCK_USER_STATS

  if (!connected) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="flex flex-col items-center justify-center text-center py-16 animate-fade-in-up">
          <div className="w-20 h-20 bg-secondary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-8">
            <Wallet className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black mb-3">Connect your wallet</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Connect your Freighter wallet to view your profile and earnings.
          </p>
          <Button onClick={connect}>
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
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
      {/* Subtle geometric accents */}
      <div className="absolute top-10 right-6 w-14 h-14 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] rotate-12 opacity-[0.06] pointer-events-none hidden xl:block" />
      <div className="absolute top-36 right-3 w-7 h-7 bg-primary border-[2px] border-black opacity-[0.08] -rotate-6 pointer-events-none hidden xl:block" />

      <h1 className="text-3xl font-black mb-8 animate-fade-in">Profile</h1>

      {/* Profile header */}
      <Card className="mb-8 animate-fade-in-up overflow-hidden">
        {/* Yellow accent strip at top */}
        <div className="h-2 bg-primary" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center text-xl font-black flex-shrink-0">
              {shortAddress?.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black">Learner</h2>
              <p className="font-mono text-sm text-muted-foreground font-bold truncate">
                {address}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="inline-block bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2">
                <p className="text-2xl font-black">
                  {formatTokens(stats.totalEarned)}
                </p>
                <p className="text-xs font-bold">LEARN earned</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Coins, label: "Total Earned", value: `${formatTokens(stats.totalEarned)} LEARN`, bg: "bg-primary" },
          { icon: Trophy, label: "Quests Owned", value: stats.workspacesOwned.toString(), bg: "bg-blue-200" },
          { icon: Target, label: "Milestones Done", value: stats.milestonesCompleted.toString(), bg: "bg-success" },
          { icon: Clock, label: "Enrolled In", value: `${stats.workspacesEnrolled} quest${stats.workspacesEnrolled !== 1 ? "s" : ""}`, bg: "bg-pink-200" },
        ].map((stat, i) => (
          <Card key={stat.label} className={`animate-fade-in-up stagger-${i + 1}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 ${stat.bg} border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-black">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings history */}
      <h2 className="text-xl font-black mb-5">Earnings History</h2>
      <div className="space-y-4">
        {earnings.length === 0 ? (
          <Card className="animate-fade-in-up">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="w-14 h-14 bg-secondary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-4">
                <Coins className="h-6 w-6" />
              </div>
              <h3 className="font-black mb-2">No earnings yet</h3>
              <p className="text-sm text-muted-foreground">
                Complete milestones to start earning LEARN tokens.
              </p>
            </CardContent>
          </Card>
        ) : (
          earnings.map((e, i) => (
            <Card key={i} className={`animate-fade-in-up stagger-${i + 1}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-sm">{e.milestone}</p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {e.workspace}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <Badge variant="success">+{e.amount} LEARN</Badge>
                    <p className="text-xs font-bold text-muted-foreground">
                      {e.date}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
