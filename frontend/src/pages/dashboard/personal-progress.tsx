import { Activity } from "lucide-react"
import type { UserStats as UserStatsType } from "@/lib/mock-data"
import { formatTokens } from "@/lib/utils"

interface PersonalProgressProps {
  stats: UserStatsType
}

export function PersonalProgress({ stats }: PersonalProgressProps) {
  return (
    <div>
      <h2 className="text-xl font-black mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" /> Your Progress
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-secondary border-[2px] border-black p-4 shadow-[3px_3px_0_#000]">
          <p className="text-xs font-bold text-muted-foreground uppercase text-center">Enrolled</p>
          <p className="text-2xl font-black mt-1 text-center">{stats.workspacesEnrolled}</p>
        </div>
        <div className="bg-secondary border-[2px] border-black p-4 shadow-[3px_3px_0_#000]">
          <p className="text-xs font-bold text-muted-foreground uppercase text-center">Completed</p>
          <p className="text-2xl font-black mt-1 text-center">{stats.milestonesCompleted}</p>
        </div>
        <div className="bg-secondary border-[2px] border-black p-4 shadow-[3px_3px_0_#000]">
          <p className="text-xs font-bold text-muted-foreground uppercase text-center">Owned</p>
          <p className="text-2xl font-black mt-1 text-center">{stats.workspacesOwned}</p>
        </div>
        <div className="bg-primary border-[2px] border-black p-4 shadow-[3px_3px_0_#000]">
          <p className="text-xs font-bold text-black uppercase text-center">Earnings</p>
          <p className="text-xl font-black mt-2 text-center text-green-800">{formatTokens(stats.totalEarned)} USDC</p>
        </div>
      </div>
    </div>
  )
}
