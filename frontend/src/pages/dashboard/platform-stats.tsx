import { Target, Users, Coins } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatTokens } from "@/lib/utils"
import type { PlatformStats as PlatformStatsType } from "@/lib/mock-data"

interface PlatformStatsProps {
  stats: PlatformStatsType
}

export function PlatformStats({ stats }: PlatformStatsProps) {
  return (
    <div className="animate-fade-in-up stagger-1 mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="card-tilt bg-background border-border border-[3px] shadow-[4px_4px_0_var(--color-border)]">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-bold tracking-wide uppercase">
                Total Quests
              </p>
              <h3 className="mt-1 text-3xl font-black">{stats.totalQuests}</h3>
            </div>
            <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border-[2px]">
              <Target className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-tilt bg-background border-border border-[3px] shadow-[4px_4px_0_var(--color-border)]">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-bold tracking-wide uppercase">
                Active Users
              </p>
              <h3 className="mt-1 text-3xl font-black">{stats.activeUsers}</h3>
            </div>
            <div className="bg-success border-border flex h-10 w-10 items-center justify-center border-[2px]">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-tilt bg-background border-border border-[3px] shadow-[4px_4px_0_var(--color-border)]">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-bold tracking-wide uppercase">
                Tokens Distributed
              </p>
              <h3 className="mt-1 text-3xl font-black text-green-700">
                {formatTokens(stats.tokensDistributed)} USDC
              </h3>
            </div>
            <div className="bg-primary border-border flex h-10 w-10 items-center justify-center border-[2px]">
              <Coins className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
