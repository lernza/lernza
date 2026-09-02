import { useState } from "react"
import {
  Users,
  TrendingUp,
  Award,
  DollarSign,
  ClipboardCheck,
  CircleAlert,
  BarChart3,
  ChevronRight,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatTokens } from "@/lib/utils"
import { QuestAnalyticsDashboard } from "@/components/analytics/QuestAnalyticsDashboard"

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
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null)

  const totalEnrollees = quests.reduce((sum, q) => sum + q.enrolleeCount, 0)
  const totalCompletions = quests.reduce((sum, q) => sum + q.completionCount, 0)
  const totalDistributed = quests.reduce((sum, q) => sum + q.totalDistributed, 0n)
  const totalPoolBalance = quests.reduce((sum, q) => sum + q.poolBalance, 0n)
  const pendingReviews = quests.reduce((sum, q) => sum + q.pendingReviews, 0)
  const stalledLearners = quests.reduce((sum, q) => sum + q.stalledLearners, 0)

  const avgCompletionRate =
    totalEnrollees > 0 ? ((totalCompletions / totalEnrollees) * 100).toFixed(1) : "0"

  const selectedQuest = quests.find(q => q.id === selectedQuestId)

  return (
    <div className="space-y-6">
      {/* Selected Quest Analytics Modal / Detail Section */}
      {selectedQuest && (
        <div className="border-primary/30 bg-card space-y-4 rounded-2xl border-2 p-6 shadow-lg">
          <div className="border-border flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-primary h-5 w-5" />
              <h3 className="text-foreground text-lg font-bold">
                Deep Analytics: {selectedQuest.name}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedQuestId(null)}
              className="h-8 w-8 p-0"
              aria-label="Close analytics"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <QuestAnalyticsDashboard
            questId={selectedQuest.id}
            questTitle={selectedQuest.name}
            totalEnrollees={selectedQuest.enrolleeCount}
            completedLearners={selectedQuest.completionCount}
            inProgressLearners={Math.max(
              0,
              selectedQuest.enrolleeCount -
                selectedQuest.completionCount -
                selectedQuest.stalledLearners
            )}
            stalledLearners={selectedQuest.stalledLearners}
            totalDistributedTokens={Number(selectedQuest.totalDistributed)}
            poolRemaining={Number(selectedQuest.poolBalance)}
          />
        </div>
      )}

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
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">To review</p>
                <p className="text-2xl font-semibold">{pendingReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <CircleAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Stalled learners
                </p>
                <p className="text-2xl font-semibold">{stalledLearners}</p>
              </div>
            </div>
          </CardContent>
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
                  <div
                    key={quest.id}
                    className="flex flex-col justify-between gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className="text-foreground font-semibold">{quest.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="mr-1 h-3 w-3" />
                          {quest.enrolleeCount} enrolled
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Award className="mr-1 h-3 w-3" />
                          {quest.completionCount}/{quest.enrolleeCount * quest.milestoneCount}{" "}
                          verified
                        </Badge>
                        <Badge
                          variant={quest.pendingReviews ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <ClipboardCheck className="mr-1 h-3 w-3" />
                          {quest.pendingReviews} remaining
                        </Badge>
                        {quest.stalledLearners > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <CircleAlert className="mr-1 h-3 w-3" />
                            {quest.stalledLearners} stalled
                          </Badge>
                        )}
                        <Badge
                          variant={Number(completionRate) >= 50 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <TrendingUp className="mr-1 h-3 w-3" />
                          {completionRate}% rate
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:ml-4">
                      <div className="text-left sm:text-right">
                        <p className="text-muted-foreground text-xs font-bold uppercase">
                          Distributed
                        </p>
                        <p className="text-base font-semibold sm:text-lg">
                          {formatTokens(quest.totalDistributed)}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Pool: {formatTokens(quest.poolBalance)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`View deep analytics for ${quest.name}`}
                        onClick={() => setSelectedQuestId(quest.id)}
                        className="shrink-0 gap-1 text-xs"
                      >
                        <BarChart3 className="text-primary h-3.5 w-3.5" />
                        <span>View Analytics</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
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
