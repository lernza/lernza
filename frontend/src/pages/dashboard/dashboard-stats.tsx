import { lazy, Suspense } from "react"
import { SectionErrorBoundary } from "@/components/error-boundary"
import { PersonalProgress } from "./personal-progress"

const EarningsChart = lazy(() => import("./earnings-chart"))

export interface DashboardStatsProps {
  personalStats: {
    totalEarned: bigint
    questsOwned: number
    questsEnrolled: number
    milestonesCompleted: number
  }
  earningsHistory: { date: string; amount: number }[]
}

/**
 * Signed-in summary: personal progress tiles plus the lazily-loaded earnings
 * chart. Rendered only when a wallet is connected.
 */
export function DashboardStats({ personalStats, earningsHistory }: DashboardStatsProps) {
  return (
    <>
      <SectionErrorBoundary label="Personal stats">
        <PersonalProgress stats={personalStats} />
      </SectionErrorBoundary>

      {/* Earnings Chart (Lazy Loaded) */}
      <SectionErrorBoundary label="Earnings chart">
        <Suspense
          fallback={
            <div className="bg-muted border-border h-[250px] animate-pulse border shadow-lg" />
          }
        >
          <EarningsChart data={earningsHistory} />
        </Suspense>
      </SectionErrorBoundary>
    </>
  )
}
