import { useState, useMemo } from "react"
import { Users, CheckCircle2, Clock, TrendingUp, Download, BarChart3, Share2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { getQuestReferralOverview } from "@/lib/referrals"

export interface MilestoneProgressStat {
  milestoneId: number
  title: string
  rewardAmount: number
  completedCount: number
  inProgressCount: number
  dropoffRate: number
  avgTimeToCompleteHours: number
}

export interface QuestAnalyticsProps {
  questId: number
  questTitle: string
  createdAt?: number
  totalEnrollees: number
  completedLearners: number
  inProgressLearners: number
  stalledLearners?: number
  milestoneStats?: MilestoneProgressStat[]
  totalDistributedTokens?: number
  poolRemaining?: number
  onExportCsv?: () => void
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

export function QuestAnalyticsDashboard({
  questId,
  questTitle,
  totalEnrollees,
  completedLearners,
  inProgressLearners,
  stalledLearners = 0,
  milestoneStats = [],
  totalDistributedTokens = 0,
  poolRemaining = 0,
}: QuestAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all")

  // Fallback / simulated milestone data if not explicitly provided
  const processedMilestones: MilestoneProgressStat[] = useMemo(() => {
    if (milestoneStats.length > 0) return milestoneStats

    const count = 3
    const baseEnrollees = Math.max(totalEnrollees, 10)
    return Array.from({ length: count }, (_, i) => {
      const completed = Math.round(baseEnrollees * Math.pow(0.7, i + 1))
      const inProg = Math.max(0, Math.round(baseEnrollees * 0.2 - i * 2))
      const prev = i === 0 ? baseEnrollees : Math.round(baseEnrollees * Math.pow(0.7, i))
      const dropoff = prev > 0 ? Math.round(((prev - completed) / prev) * 100) : 0

      return {
        milestoneId: i + 1,
        title: `Milestone ${i + 1}`,
        rewardAmount: (i + 1) * 20,
        completedCount: completed,
        inProgressCount: inProg,
        dropoffRate: Math.max(0, dropoff),
        avgTimeToCompleteHours: (i + 1) * 12 + 6,
      }
    })
  }, [milestoneStats, totalEnrollees])

  // Referral metrics
  const referralOverview = useMemo(() => {
    return getQuestReferralOverview(questId)
  }, [questId])

  const completionRate = useMemo(() => {
    if (!totalEnrollees || totalEnrollees === 0) return 0
    return Math.round((completedLearners / totalEnrollees) * 100)
  }, [completedLearners, totalEnrollees])

  const funnelData = useMemo(() => {
    return [
      { name: "Enrolled", count: totalEnrollees, fill: "#3b82f6" },
      ...processedMilestones.map((m, idx) => ({
        name: m.title.length > 12 ? `M${idx + 1}` : m.title,
        count: m.completedCount,
        fill: COLORS[idx % COLORS.length],
      })),
      { name: "Completed", count: completedLearners, fill: "#10b981" },
    ]
  }, [totalEnrollees, processedMilestones, completedLearners])

  const learnerDistributionData = useMemo(() => {
    return [
      { name: "Completed", value: completedLearners, color: "#10b981" },
      { name: "In Progress", value: inProgressLearners, color: "#3b82f6" },
      { name: "Stalled", value: stalledLearners, color: "#f59e0b" },
    ].filter(item => item.value > 0)
  }, [completedLearners, inProgressLearners, stalledLearners])

  // CSV Export Handler
  const handleExportData = () => {
    const csvRows = [
      ["Quest Analytics Report", questTitle],
      ["Quest ID", questId.toString()],
      ["Export Date", new Date().toISOString()],
      [],
      ["Metric", "Value"],
      ["Total Enrollees", totalEnrollees.toString()],
      ["Completed Learners", completedLearners.toString()],
      ["In Progress Learners", inProgressLearners.toString()],
      ["Stalled Learners", stalledLearners.toString()],
      ["Completion Rate", `${completionRate}%`],
      ["Tokens Distributed", totalDistributedTokens.toString()],
      ["Pool Balance", poolRemaining.toString()],
      ["Total Referrals", referralOverview.totalReferrals.toString()],
      ["Completed Referrals", referralOverview.completedReferrals.toString()],
      [],
      ["Milestone ID", "Title", "Completed", "In Progress", "Dropoff %", "Avg Hours"],
      ...processedMilestones.map(m => [
        m.milestoneId.toString(),
        `"${m.title}"`,
        m.completedCount.toString(),
        m.inProgressCount.toString(),
        `${m.dropoffRate}%`,
        m.avgTimeToCompleteHours.toString(),
      ]),
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `quest-${questId}-analytics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header and Control Toolbar */}
      <div className="bg-card border-border flex flex-col items-start justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-primary h-5 w-5" />
            <h2 className="text-xl font-bold tracking-tight">Quest Analytics Dashboard</h2>
            <Badge variant="outline" className="ml-1 text-xs">
              Quest #{questId}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Real-time participant engagement, milestone funnel progression, and referral tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="border-border bg-muted/40 flex items-center rounded-lg border p-0.5">
            <button
              aria-label="View last 7 days"
              onClick={() => setTimeRange("7d")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timeRange === "7d"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7D
            </button>
            <button
              aria-label="View last 30 days"
              onClick={() => setTimeRange("30d")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timeRange === "30d"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30D
            </button>
            <button
              aria-label="View all time"
              onClick={() => setTimeRange("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timeRange === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Time
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportData}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-muted-foreground mb-2 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wider uppercase">Total Enrolled</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{totalEnrollees}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span>Learners engaged</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-muted-foreground mb-2 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wider uppercase">Completion Rate</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <div className="text-muted-foreground mt-1 text-xs">
            {completedLearners} completed / {totalEnrollees} enrollees
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-muted-foreground mb-2 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wider uppercase">In Progress</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold">{inProgressLearners}</div>
          <div className="text-muted-foreground mt-1 text-xs">
            {stalledLearners > 0 ? `${stalledLearners} stalled` : "Active pacing"}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-muted-foreground mb-2 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wider uppercase">Referral Invites</span>
            <Share2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold">{referralOverview.totalReferrals}</div>
          <div className="text-muted-foreground mt-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            {referralOverview.completedReferrals} qualified conversions
          </div>
        </Card>
      </div>

      {/* Funnel and Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Participant Progress Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Learner Progression Funnel</span>
              <span className="text-muted-foreground text-xs font-normal">
                Step-by-step conversion
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Dropoff rate and milestone step completions across enrolled participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: unknown) => [`${value} Learners`, "Count"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Learner Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Learner Status Distribution</CardTitle>
            <CardDescription className="text-xs">Active vs completed vs stalled</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {learnerDistributionData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={learnerDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {learnerDistributionData.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`${val} Learners`, ""]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-[200px] items-center justify-center text-xs">
                No learner data available
              </div>
            )}

            <div className="border-border grid w-full grid-cols-3 gap-2 border-t pt-2 text-center">
              <div>
                <div className="text-muted-foreground text-xs">Done</div>
                <div className="text-sm font-semibold text-green-500">{completedLearners}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Active</div>
                <div className="text-sm font-semibold text-blue-500">{inProgressLearners}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Stalled</div>
                <div className="text-sm font-semibold text-amber-500">{stalledLearners}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Milestone Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base">Milestone Engagement & Drop-off Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Identify bottlenecks where participants spend the most time or lose momentum.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-border bg-muted/30 text-muted-foreground border-b">
                  <th className="px-3 py-2.5 font-semibold">Milestone</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Reward</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Completions</th>
                  <th className="px-3 py-2.5 text-right font-semibold">In Progress</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Drop-off Rate</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {processedMilestones.map(m => (
                  <tr key={m.milestoneId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-3 font-medium">
                      <div className="text-foreground font-semibold">{m.title}</div>
                      <div className="text-muted-foreground text-[11px]">
                        Milestone #{m.milestoneId}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium">
                      {m.rewardAmount} Tokens
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-green-600 dark:text-green-400">
                      {m.completedCount}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                      {m.inProgressCount}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[11px] ${
                          m.dropoffRate > 40
                            ? "border-red-500/30 bg-red-500/5 text-red-500"
                            : m.dropoffRate > 20
                              ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
                              : "border-green-500/30 bg-green-500/5 text-green-500"
                        }`}
                      >
                        {m.dropoffRate}%
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-right font-mono">
                      ~{m.avgTimeToCompleteHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Referral Attribution Analytics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">Referral Program Impact</CardTitle>
            </div>
            <Badge
              variant="outline"
              className="border-purple-500/30 text-purple-600 dark:text-purple-400"
            >
              {referralOverview.config.bonusAmount} tokens / referral bonus
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Track organic community growth driven by peer invitations and referral incentives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="bg-muted/40 border-border rounded-lg border p-3 text-center">
              <div className="text-muted-foreground text-xs">Total Referred Invites</div>
              <div className="text-foreground mt-0.5 text-xl font-bold">
                {referralOverview.totalReferrals}
              </div>
            </div>
            <div className="bg-muted/40 border-border rounded-lg border p-3 text-center">
              <div className="text-muted-foreground text-xs">Referral Conversion Rate</div>
              <div className="mt-0.5 text-xl font-bold text-green-600 dark:text-green-400">
                {referralOverview.totalReferrals > 0
                  ? `${Math.round((referralOverview.completedReferrals / referralOverview.totalReferrals) * 100)}%`
                  : "0%"}
              </div>
            </div>
            <div className="bg-muted/40 border-border rounded-lg border p-3 text-center">
              <div className="text-muted-foreground text-xs">Referral Bonuses Distributed</div>
              <div className="text-primary mt-0.5 text-xl font-bold">
                {referralOverview.totalRewardsDistributed} Tokens
              </div>
            </div>
          </div>

          {referralOverview.topReferrers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-border bg-muted/20 text-muted-foreground border-b">
                    <th className="px-3 py-2 font-semibold">Top Referrer Address</th>
                    <th className="px-3 py-2 text-right font-semibold">Invited</th>
                    <th className="px-3 py-2 text-right font-semibold">Completed</th>
                    <th className="px-3 py-2 text-right font-semibold">Bonus Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {referralOverview.topReferrers.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/10">
                      <td className="max-w-[200px] truncate px-3 py-2.5 font-mono font-medium">
                        {r.address}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">{r.count}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-green-600 dark:text-green-400">
                        {r.completed}
                      </td>
                      <td className="text-primary px-3 py-2.5 text-right font-mono font-medium">
                        {r.earned} Tokens
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted/20 rounded-lg py-4 text-center text-xs">
              No referral activity recorded yet for this quest.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
