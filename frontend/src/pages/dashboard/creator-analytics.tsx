import { Users, TrendingUp, Award, DollarSign, ClipboardCheck, CircleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTokens } from "@/lib/utils"

interface CreatorAnalyticsProps {
  quests: Array<{
    id: number
    name: string
    enrolleeCount: number
    completionCount: number
    pendingReviews: number
    stalledLearners: number
    milestoneCount: number
    poolBalance: bigint
    totalDistributed: bigint
  }>
}

export function CreatorAnalytics({ quests }: CreatorAnalyticsProps) {
  const totalEnrollees = quests.reduce((sum, q) => sum + q.enrolleeCount, 0)
  const totalCompletions = quests.reduce((sum, q) => sum + q.completionCount, 0)
  const totalDistributed = quests.reduce((sum, q) => sum + q.totalDistributed, 0n)
  const totalPoolBalance = quests.reduce((sum, q) => sum + q.poolBalance, 0n)
  const pendingReviews = quests.reduce((sum, q) => sum + q.pendingReviews, 0)
  const stalledLearners = quests.reduce((sum, q) => sum + q.stalledLearners, 0)

  const avgCompletionRate =
    totalEnrollees > 0 ? ((totalCompletions / totalEnrollees) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="animate-fade-in-up stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Total Enrollees</p>
                <p className="text-2xl font-semibold">{totalEnrollees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Completion Rate</p>
                <p className="text-2xl font-semibold">{avgCompletionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up stagger-3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Distributed</p>
                <p className="text-2xl font-semibold">{formatTokens(totalDistributed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up stagger-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Pool Balance</p>
                <p className="text-2xl font-semibold">{formatTokens(totalPoolBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6"><div className="flex items-center gap-3"><div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border"><ClipboardCheck className="h-5 w-5" /></div><div><p className="text-muted-foreground text-xs font-bold uppercase">To review</p><p className="text-2xl font-semibold">{pendingReviews}</p></div></div></CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6"><div className="flex items-center gap-3"><div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border"><CircleAlert className="h-5 w-5" /></div><div><p className="text-muted-foreground text-xs font-bold uppercase">Stalled learners</p><p className="text-2xl font-semibold">{stalledLearners}</p></div></div></CardContent>
        </Card>
      </div>

      {/* Quest List */}
      <Card>
        <CardHeader>
          <CardTitle>Quest Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y">
            {quests.length > 0 ? (
              quests.map(quest => {
                const completionRate =
                  quest.enrolleeCount > 0
                    ? ((quest.completionCount / quest.enrolleeCount) * 100).toFixed(0)
                    : "0"

                return (
                  <div key={quest.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-semibold">{quest.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="mr-1 h-3 w-3" />
                          {quest.enrolleeCount} enrolled
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Award className="mr-1 h-3 w-3" />
                          {quest.completionCount}/{quest.enrolleeCount * quest.milestoneCount} verified
                        </Badge>
                        <Badge variant={quest.pendingReviews ? "default" : "secondary"} className="text-xs"><ClipboardCheck className="mr-1 h-3 w-3" />{quest.pendingReviews} remaining</Badge>
                        {quest.stalledLearners > 0 && <Badge variant="destructive" className="text-xs"><CircleAlert className="mr-1 h-3 w-3" />{quest.stalledLearners} stalled</Badge>}
                        <Badge
                          variant={Number(completionRate) >= 50 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <TrendingUp className="mr-1 h-3 w-3" />
                          {completionRate}% rate
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-muted-foreground text-xs font-bold uppercase">Distributed</p>
                      <p className="text-lg font-semibold">{formatTokens(quest.totalDistributed)}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Pool: {formatTokens(quest.poolBalance)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground font-bold">No quests created yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
