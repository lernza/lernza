import { Target, Users, Coins } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatTokens } from "@/lib/utils"
import type { PlatformStats as PlatformStatsType } from "@/lib/mock-data"

interface PlatformStatsProps {
  stats: PlatformStatsType
}

export function PlatformStats({ stats }: PlatformStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up stagger-1">
      <Card className="card-tilt bg-white border-[3px] border-black shadow-[4px_4px_0_#000]">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Total Quests</p>
              <h3 className="text-3xl font-black mt-1">{stats.totalQuests}</h3>
            </div>
            <div className="w-10 h-10 bg-secondary border-[2px] border-black flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-tilt bg-white border-[3px] border-black shadow-[4px_4px_0_#000]">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Active Users</p>
              <h3 className="text-3xl font-black mt-1">{stats.activeUsers}</h3>
            </div>
            <div className="w-10 h-10 bg-success border-[2px] border-black flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-tilt bg-white border-[3px] border-black shadow-[4px_4px_0_#000]">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Tokens Distributed</p>
              <h3 className="text-3xl font-black mt-1 text-green-700">{formatTokens(stats.tokensDistributed)} USDC</h3>
            </div>
            <div className="w-10 h-10 bg-primary border-[2px] border-black flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
