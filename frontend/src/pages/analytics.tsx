import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { BarChart3, Users, Coins, Target, RefreshCw, TrendingUp, Award, Download, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { PageMetadata } from "@/components/PageMetadata"
import { PAGE_METADATA } from "@/lib/page-metadata"
import { LoadingState, EmptyState } from "@/components/ui/async-states"
import { SmartError } from "@/components/error-states"
import { questClient } from "@/lib/contracts/quest"
import { rewardsClient } from "@/lib/contracts/rewards"
import { milestoneClient } from "@/lib/contracts/milestone-client"
import { formatTokens, getQuestLifecycleStatus } from "@/lib/utils"
import {
  analyticsFilename,
  buildAnalyticsCsv,
  downloadCsv,
  exportPdf,
  filterByCreatedAt,
  type DateRange,
} from "@/lib/analytics-export"
import type { QuestInfo } from "@/lib/contract-types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformStats {
  totalQuests: number
  activeQuests: number
  archivedQuests: number
  cancelledQuests: number
  totalFunded: bigint
  totalDistributed: bigint
}

interface QuestAnalytics {
  id: number
  name: string
  createdAt: number
  enrollees: number
  milestones: number
  completedMilestones: number
  poolBalance: bigint
}

const COLORS = ["#000000", "#6366f1", "#10b981", "#f59e0b", "#ef4444"]

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchPlatformStats(): Promise<PlatformStats> {
  const [questCount, platformStats] = await Promise.all([
    questClient.getQuestCount(),
    rewardsClient.getPlatformStats(),
  ])

  const pageSize = 20
  const offsets: number[] = []
  for (let offset = 0; offset < questCount; offset += pageSize) {
    offsets.push(offset)
  }

  // Fetch all pages concurrently with bounded concurrency
  const batches = await Promise.all(
    offsets.map(offset => questClient.listPublicQuests(offset, pageSize))
  )
  const quests: QuestInfo[] = batches.flat()

  // Derived via the shared lifecycle-status function so a quest whose
  // deadline has passed but was never explicitly archived isn't miscounted
  // as still "active" (see lib/utils.ts's getQuestLifecycleStatus).
  const lifecycleStatuses = quests.map(q => getQuestLifecycleStatus(q))
  const activeQuests = lifecycleStatuses.filter(s => s === "active").length
  const archivedQuests = lifecycleStatuses.filter(s => s === "archived").length
  const cancelledQuests = lifecycleStatuses.filter(s => s === "cancelled").length

  return {
    totalQuests: questCount,
    activeQuests,
    archivedQuests,
    cancelledQuests,
    totalFunded: platformStats.totalFunded,
    totalDistributed: platformStats.totalDistributed,
  }
}

async function fetchQuestAnalytics(questIds: number[]): Promise<QuestAnalytics[]> {
  const results = await Promise.all(
    questIds.map(async id => {
      const [quest, enrollees, milestoneCount, poolBalance] = await Promise.all([
        questClient.getQuest(id),
        questClient.getEnrollees(id),
        milestoneClient.getMilestoneCount(id),
        rewardsClient.getPoolBalance(id),
      ])

      let completedMilestones = 0
      if (milestoneCount > 0) {
        const completions = await Promise.all(
          enrollees.map(e => milestoneClient.getEnrolleeCompletions(id, e))
        )
        completedMilestones = completions.reduce((sum, c) => sum + c, 0)
      }

      return {
        id,
        name: quest?.name ?? `Quest #${id}`,
        createdAt: quest?.createdAt ?? 0,
        enrollees: enrollees.length,
        milestones: milestoneCount,
        completedMilestones,
        poolBalance,
      }
    })
  )

  return results
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card className="border-border shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusPieChart({ stats }: { stats: PlatformStats }) {
  const data = [
    { name: "Active", value: stats.activeQuests },
    { name: "Archived", value: stats.archivedQuests },
    { name: "Cancelled", value: stats.cancelledQuests },
  ].filter(d => d.value > 0)

  if (data.length === 0) return null

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="border-border border-b py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" /> Quest Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function EnrollmentBarChart({ quests }: { quests: QuestAnalytics[] }) {
  const data = quests.slice(0, 10).map(q => ({ name: q.name.slice(0, 20), enrollees: q.enrollees }))

  if (data.length === 0) return null

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="border-border border-b py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" /> Enrollment by Quest
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "2px solid #000",
                  boxShadow: "4px 4px 0 #000",
                  borderRadius: 0,
                  fontWeight: "bold",
                }}
              />
              <Bar dataKey="enrollees" fill="#000" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function MilestoneCompletionChart({ quests }: { quests: QuestAnalytics[] }) {
  const data = quests
    .filter(q => q.milestones > 0)
    .slice(0, 10)
    .map(q => ({
      name: q.name.slice(0, 20),
      completed: q.completedMilestones,
      pending: q.milestones * q.enrollees - q.completedMilestones,
    }))

  if (data.length === 0) return null

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="border-border border-b py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" /> Milestone Completions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "2px solid #000",
                  boxShadow: "4px 4px 0 #000",
                  borderRadius: 0,
                  fontWeight: "bold",
                }}
              />
              <Legend />
              <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill="#e5e7eb" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function QuestRewardsTable({ quests }: { quests: QuestAnalytics[] }) {
  const sorted = [...quests].sort((a, b) => {
    if (b.poolBalance > a.poolBalance) return 1
    if (b.poolBalance < a.poolBalance) return -1
    return 0
  })

  return (
    <Card className="border-border overflow-hidden shadow-lg">
      <CardHeader className="border-border border-b py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5" /> Quest Rewards Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium">Quest</th>
                <th className="px-4 py-3 text-right font-medium">Enrollees</th>
                <th className="px-4 py-3 text-right font-medium">Milestones</th>
                <th className="px-4 py-3 text-right font-medium">Pool Balance</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(q => (
                <tr
                  key={q.id}
                  className="border-border hover:bg-muted/30 border-b transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{q.name}</td>
                  <td className="px-4 py-3 text-right">{q.enrollees}</td>
                  <td className="px-4 py-3 text-right">{q.milestones}</td>
                  <td className="px-4 py-3 text-right">{formatTokens(q.poolBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Analytics() {
  return (
    <>
      <PageMetadata {...PAGE_METADATA.analytics} />
      <AnalyticsContent />
    </>
  )
}

function AnalyticsContent() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [questAnalytics, setQuestAnalytics] = useState<QuestAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRange>({ from: "", to: "" })

  // Date filtering applies to the exported reports and to every chart/table
  // below, so what a creator sees is what they download.
  const visibleQuests = useMemo(() => filterByCreatedAt(questAnalytics, range), [questAnalytics, range])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const platformStats = await fetchPlatformStats()
      setStats(platformStats)

      // Fetch analytics for first 20 quests
      const questIds = Array.from({ length: Math.min(platformStats.totalQuests, 20) }, (_, i) => i)
      const analytics = await fetchQuestAnalytics(questIds)
      setQuestAnalytics(analytics)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const exportCsv = () => {
    downloadCsv(analyticsFilename(range, "csv"), buildAnalyticsCsv(visibleQuests, range))
  }

  if (loading) return <LoadingState message="Loading analytics..." />
  if (error) return <SmartError message={error} onRetry={load} />
  if (!stats) return <EmptyState title="No Data" description="No analytics data available" />

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        subtitle="Platform-wide quest and reward metrics"
        action={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Date range filter + exports (issue #1648) */}
      <div className="print:hidden mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="analytics-from" className="text-muted-foreground mb-1 block text-xs font-medium">
              Created from
            </label>
            <input
              id="analytics-from"
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
              className="border-border rounded-md border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="analytics-to" className="text-muted-foreground mb-1 block text-xs font-medium">
              Created to
            </label>
            <input
              id="analytics-to"
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
              className="border-border rounded-md border px-2 py-1.5 text-sm"
            />
          </div>
          {(range.from || range.to) && (
            <Button variant="ghost" size="sm" onClick={() => setRange({ from: "", to: "" })}>
              Clear
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={visibleQuests.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {visibleQuests.length !== questAnalytics.length && (
        <p className="text-muted-foreground mb-4 text-sm">
          Showing {visibleQuests.length} of {questAnalytics.length} quests in the selected date range.
        </p>
      )}

      {/* Platform overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Target}
          label="Total Quests"
          value={String(stats.totalQuests)}
          sub={`${stats.activeQuests} active`}
        />
        <StatCard icon={Users} label="Active Quests" value={String(stats.activeQuests)} />
        <StatCard icon={Coins} label="Total Funded" value={formatTokens(stats.totalFunded)} />
        <StatCard
          icon={TrendingUp}
          label="Total Distributed"
          value={formatTokens(stats.totalDistributed)}
        />
      </div>

      {/* Charts row */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusPieChart stats={stats} />
        <EnrollmentBarChart quests={visibleQuests} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MilestoneCompletionChart quests={visibleQuests} />
        <Card className="border-border shadow-lg">
          <CardHeader className="border-border border-b py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" /> Platform Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Quests Funded</span>
              <Badge variant="secondary">{stats.totalQuests}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Active Quests</span>
              <Badge variant="secondary">{stats.activeQuests}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Avg. Enrollment</span>
              <Badge variant="secondary">
                {visibleQuests.length > 0
                  ? (
                      visibleQuests.reduce((s, q) => s + q.enrollees, 0) / visibleQuests.length
                    ).toFixed(1)
                  : "0"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Avg. Milestones/Quest</span>
              <Badge variant="secondary">
                {visibleQuests.length > 0
                  ? (
                      visibleQuests.reduce((s, q) => s + q.milestones, 0) / visibleQuests.length
                    ).toFixed(1)
                  : "0"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Completion Rate</span>
              <Badge variant="secondary">
                {visibleQuests.length > 0
                  ? (() => {
                      const totalPossible = visibleQuests.reduce(
                        (s, q) => s + q.milestones * q.enrollees,
                        0
                      )
                      const totalCompleted = visibleQuests.reduce(
                        (s, q) => s + q.completedMilestones,
                        0
                      )
                      return totalPossible > 0
                        ? `${((totalCompleted / totalPossible) * 100).toFixed(1)}%`
                        : "0%"
                    })()
                  : "0%"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quest rewards table */}
      <QuestRewardsTable quests={visibleQuests} />
    </PageContainer>
  )
}

export default Analytics
