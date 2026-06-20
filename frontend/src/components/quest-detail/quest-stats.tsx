import { Users, Target, Coins, Clock, Layout, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatTokens } from "@/lib/utils"

interface QuestStatsProps {
  enrollees: number
  milestones: number
  poolBalance: bigint
  totalReward: bigint
  deadlineDays: number
  statsInView: boolean
}

export function QuestStats({
  enrollees,
  milestones,
  poolBalance,
  totalReward,
  deadlineDays,
  statsInView,
}: QuestStatsProps) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {[
        {
          icon: Users,
          label: "Enrolled",
          value: enrollees,
          bg: "bg-accent",
        },
        {
          icon: Target,
          label: "Milestones",
          value: milestones,
          bg: "bg-success",
        },
        {
          icon: Coins,
          label: "Available Pool",
          value: formatTokens(Number(poolBalance)),
          bg: "bg-warning",
        },
        {
          icon: TrendingUp,
          label: "Reward/User",
          value: formatTokens(Number(totalReward)),
          bg: "bg-info",
        },
        {
          icon: Clock,
          label: "Deadline",
          value: `${deadlineDays} Days left`,
          bg: "bg-destructive",
        },
        {
          icon: Layout,
          label: "Category",
          value: "Developer",
          bg: "bg-secondary",
        },
      ].map((stat, i) => (
        <div
          key={stat.label}
          className={`reveal-up ${statsInView ? "in-view" : ""}`}
          style={{ transitionDelay: `${i * 100}ms` }}
        >
          <Card className="neo-lift border-border border-2 bg-white transition-all hover:shadow-lg active:shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:items-start">
              <div
                className={`h-10 w-10 ${stat.bg} border-border animate-scale-in flex flex-shrink-0 items-center justify-center border shadow-sm`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  {stat.label}
                </p>
                <p className="text-base font-semibold whitespace-nowrap tabular-nums">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
