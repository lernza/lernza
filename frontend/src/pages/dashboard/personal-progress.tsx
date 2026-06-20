import { Activity } from "lucide-react"
import { formatTokens } from "@/lib/utils"

interface UserStatsType {
  totalEarned: number
  questsOwned: number
  questsEnrolled: number
  milestonesCompleted: number
}

interface PersonalProgressProps {
  stats: UserStatsType
}

export function PersonalProgress({ stats }: PersonalProgressProps) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Activity className="h-5 w-5" /> Your Progress
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-secondary border-border border p-4 shadow-md">
          <p className="text-muted-foreground text-center text-xs font-bold uppercase">Enrolled</p>
          <p className="mt-1 text-center text-2xl font-semibold">{stats.questsEnrolled}</p>
        </div>
        <div className="bg-secondary border-border border p-4 shadow-md">
          <p className="text-muted-foreground text-center text-xs font-bold uppercase">Completed</p>
          <p className="mt-1 text-center text-2xl font-semibold">{stats.milestonesCompleted}</p>
        </div>
        <div className="bg-secondary border-border border p-4 shadow-md">
          <p className="text-muted-foreground text-center text-xs font-bold uppercase">Owned</p>
          <p className="mt-1 text-center text-2xl font-semibold">{stats.questsOwned}</p>
        </div>
        <div className="bg-accent border-border border p-4 shadow-md">
          <p className="text-foreground text-center text-xs font-bold uppercase">Earnings</p>
          <p className="mt-2 text-center text-xl font-semibold text-green-800">
            {formatTokens(stats.totalEarned)} USDC
          </p>
        </div>
      </div>
    </div>
  )
}
