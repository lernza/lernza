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
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="rounded-full bg-muted p-4 mb-6">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect your wallet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
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

  // Mock earnings history
  const earnings = [
    { milestone: "Hello World", workspace: "Learn to Code with Alex", amount: 50, date: "2 days ago" },
    { milestone: "Build a CLI Tool", workspace: "Learn to Code with Alex", amount: 100, date: "5 days ago" },
    { milestone: "Set up Stellar CLI", workspace: "Stellar Dev Bootcamp", amount: 100, date: "1 week ago" },
    { milestone: "First Soroban Contract", workspace: "Stellar Dev Bootcamp", amount: 200, date: "2 weeks ago" },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-8">Profile</h1>

      {/* Profile header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold flex-shrink-0">
              {shortAddress?.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Learner</h2>
              <p className="font-mono text-sm text-muted-foreground truncate">
                {address}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-3xl font-bold text-primary">
                {formatTokens(stats.totalEarned)}
              </p>
              <p className="text-sm text-muted-foreground">LEARN earned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: Coins,
            label: "Total Earned",
            value: `${formatTokens(stats.totalEarned)} LEARN`,
            color: "text-primary",
          },
          {
            icon: Trophy,
            label: "Workspaces Owned",
            value: stats.workspacesOwned.toString(),
          },
          {
            icon: Target,
            label: "Milestones Done",
            value: stats.milestonesCompleted.toString(),
            color: "text-success",
          },
          {
            icon: Clock,
            label: "Enrolled In",
            value: `${stats.workspacesEnrolled} workspace${stats.workspacesEnrolled !== 1 ? "s" : ""}`,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color || "text-foreground"}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings history */}
      <h2 className="text-lg font-semibold mb-4">Earnings History</h2>
      <div className="space-y-3">
        {earnings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Coins className="h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No earnings yet</h3>
              <p className="text-sm text-muted-foreground">
                Complete milestones to start earning LEARN tokens.
              </p>
            </CardContent>
          </Card>
        ) : (
          earnings.map((e, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{e.milestone}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.workspace}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">+{e.amount} LEARN</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
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
