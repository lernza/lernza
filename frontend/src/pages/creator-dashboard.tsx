import { LayoutDashboard, Plus, RefreshCw } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { useContractData } from "@/hooks/use-async-data"
import { questClient } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { SmartError } from "@/components/error-states"
import { SkeletonQuestList } from "@/components/ui/skeleton"
import { CreatorAnalytics } from "./dashboard/creator-analytics"
import { navigateToPath } from "@/lib/navigation"

export function CreatorDashboard() {
  const { address, connected, connect } = useWallet()

  const {
    data: creatorData,
    isLoading,
    error,
    refetch,
  } = useContractData(
    `creator-dashboard-${address}`,
    async () => {
      if (!address) return null

      const ownedQuests = await questClient.listQuestsByOwner(address)

      const questsWithStats = await Promise.all(
        ownedQuests.map(async quest => {
          const [enrollees, milestones, poolBalance] = await Promise.all([
            questClient.getEnrollees(quest.id),
            milestoneClient.listMilestones(quest.id),
            rewardsClient.getPoolBalance(quest.id),
          ])

          // Count completions across all enrollees
          const completionCounts = await Promise.all(
            enrollees.map(enrollee => milestoneClient.getEnrolleeCompletions(quest.id, enrollee))
          )
          const totalCompletions = completionCounts.reduce((sum, count) => sum + count, 0)
          const stalledLearners = completionCounts.filter(count => count === 0).length
          const pendingReviews = enrollees.reduce(
            (sum, _, index) => sum + Math.max(milestones.length - completionCounts[index], 0),
            0
          )

          // Estimate distributed amount based on milestone rewards
          const estimatedDistributed = completionCounts.reduce((sum, completions) =>
            sum + milestones.slice(0, completions).reduce((earned, milestone) => earned + milestone.rewardAmount, 0n), 0n)

          return {
            id: quest.id,
            name: quest.name,
            enrolleeCount: enrollees.length,
            completionCount: totalCompletions,
            pendingReviews,
            stalledLearners,
            milestoneCount: milestones.length,
            poolBalance,
            totalDistributed: estimatedDistributed,
          }
        })
      )

      return { quests: questsWithStats }
    },
    {
      enabled: !!address && connected,
      queryKey: [address],
    }
  )

  if (!connected) {
    return (
      <PageContainer>
        <div className="border-border bg-secondary flex min-h-[400px] flex-col items-center justify-center border p-8 text-center">
          <LayoutDashboard className="text-muted-foreground mb-4 h-12 w-12" />
          <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Connect your wallet to access the creator dashboard and manage your quests.
          </p>
          <Button onClick={connect} className="shimmer-on-hover">
            Connect Wallet
          </Button>
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <SmartError message={error} onRetry={() => void refetch()} />
      </PageContainer>
    )
  }

  if (isLoading || !creatorData) {
    return (
      <PageContainer>
        <div className="mb-8">
          <div className="border-border bg-muted mb-4 h-12 animate-pulse border" />
          <div className="border-border bg-muted h-8 w-64 animate-pulse border" />
        </div>
        <SkeletonQuestList count={3} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <>
            <LayoutDashboard className="h-4 w-4" />
            Creator Dashboard
          </>
        }
        title="Manage Your Quests"
        subtitle="Track analytics, participant status, and fund distribution"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="shimmer-on-hover"
              onClick={() => navigateToPath("/create-quest")}
            >
              <Plus className="h-4 w-4" />
              Create Quest
            </Button>
          </div>
        }
      />

      <CreatorAnalytics quests={creatorData.quests} />
    </PageContainer>
  )
}
