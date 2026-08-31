import { Users, Target, Coins } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsPanelProps {
  enrolleesCount: number
  milestonesCount: number
  poolBalance: number
  reservedReward: number
  totalReward: number
}

export function StatsPanel({ enrolleesCount, milestonesCount, poolBalance, reservedReward, totalReward }: StatsPanelProps) {
  const stats = [
    {
      label: "Enrollees",
      value: enrolleesCount,
      Icon: Users,
    },
    {
      label: "Milestones",
      value: milestonesCount,
      Icon: Target,
    },
    {
      label: "Reserved Reward",
      value: `${reservedReward} USDC`,
      Icon: Coins,
    },
    {
      label: "Uncommitted Reward",
      value: `${Math.max(0, poolBalance - reservedReward)} USDC`,
      Icon: Coins,
    },
  ]

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, Icon }) => (
        <div
          key={label}
          className={cn(
            "border-border bg-card flex items-center gap-4 border p-5 shadow-md",
            "transition-all hover:shadow-lg"
          )}
        >
          <div className="bg-accent/20 flex h-12 w-12 items-center justify-center">
            <Icon className="text-foreground h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {label}
            </p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
