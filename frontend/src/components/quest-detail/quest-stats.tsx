 
import { Users, Target, Coins } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useInView, useCountUp } from "@/hooks/use-animations"
import { formatTokens } from "@/lib/utils"

interface QuestStatsProps {
  enrolleesCount: number
  milestonesCount: number
  poolBalance: number
  totalReward: number
}

export function QuestStats({
  enrolleesCount,
  milestonesCount,
  poolBalance,
  totalReward,
}: QuestStatsProps) {
  const [statsRef, statsInView] = useInView()

  const animatedEnrollees = useCountUp(enrolleesCount, 400, statsInView)
  const animatedMilestones = useCountUp(milestonesCount, 400, statsInView)
  const animatedPoolBalance = useCountUp(poolBalance, 800, statsInView)
  const animatedTotalReward = useCountUp(totalReward, 800, statsInView)

  const stats = [
    {
      icon: Users,
      label: "Enrollees",
      value: animatedEnrollees,
      bg: "bg-accent",
    },
    {
      icon: Target,
      label: "Milestones",
      value: animatedMilestones,
      bg: "bg-accent",
    },
    {
      icon: Coins,
      label: "Pool Balance",
      value: formatTokens(animatedPoolBalance),
      bg: "bg-accent",
    },
    {
      icon: Coins,
      label: "Total Rewards",
      value: formatTokens(animatedTotalReward),
      bg: "bg-success",
    },
  ]

  return (
    <div ref={statsRef} className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`reveal-up ${statsInView ? "in-view" : ""}`}
          style={{ transitionDelay: `${i * 100}ms` }}
        >
          <Card className="neo-lift hover:shadow-lg active:shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`h-10 w-10 ${stat.bg} border-border flex flex-shrink-0 items-center justify-center border shadow-sm`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold">{stat.label}</p>
                <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
