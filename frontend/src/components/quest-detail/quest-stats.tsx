import {
  Users,
  Target,
  Coins,
  Clock,
  Layout,
  TrendingUp,
} from "lucide-react"
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
  statsInView
}: QuestStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {[
        {
          icon: Users,
          label: "Enrolled",
          value: enrollees,
          bg: "bg-primary",
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
          <Card className="neo-lift bg-white hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] border-black border-2 transition-all">
            <CardContent className="p-4 flex flex-col items-center sm:items-start sm:flex-row gap-3">
              <div
                className={`w-10 h-10 ${stat.bg} border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center flex-shrink-0 animate-scale-in`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-base font-black tabular-nums whitespace-nowrap">
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
