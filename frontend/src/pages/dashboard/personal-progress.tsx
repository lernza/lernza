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
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
        <Activity className="h-5 w-5" /> Your Progress
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-secondary border-border border-[2px] p-4 shadow-[3px_3px_0_var(--color-border)]">
          <p className="text-muted-foreground text-center text-xs font-bold uppercase">Enrolled</p>
          <p className="mt-1 text-center text-2xl font-black">{stats.questsEnrolled}</p>
        </div>
        <div className="bg-secondary border-border border-[2px] p-4 shadow-[3px_3px_0_var(--color-border)]">
          <p className="text-muted-foreground text-center text-xs font-bold uppercase">Completed</p>
          <p className="mt-1 text-center text-2xl font-black">{stats.milestonesCompleted}</p>
        </div>
        <div className="bg-secondary border-border border-[2px] p-4 shadow-[3px_3px_0_var(--color-border)]">
          <p className="text-muted-foreground text-center text-xs font-bold uppercase">Owned</p>
          <p className="mt-1 text-center text-2xl font-black">{stats.questsOwned}</p>
        </div>
        <div className="bg-primary border-border border-[2px] p-4 shadow-[3px_3px_0_var(--color-border)]">
          <p className="text-foreground text-center text-xs font-bold uppercase">Earnings</p>
          <p className="mt-2 text-center text-xl font-black text-green-800">
            {formatTokens(stats.totalEarned)} USDC
          </p>
        </div>
      </div>
    </div>
  )
}
