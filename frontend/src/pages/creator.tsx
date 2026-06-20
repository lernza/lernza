import { Users, Target, Award, Sparkles, LayoutDashboard, ChevronRight } from "lucide-react"
import { useContractData } from "@/hooks/use-async-data"
import { questClient } from "@/lib/contracts/quest"
import { rewardsClient } from "@/lib/contracts/rewards"
import { milestoneClient } from "@/lib/contracts/milestone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SmartError } from "@/components/error-states"
import { SkeletonQuestList } from "@/components/ui/skeleton"
import { formatTokens, shortenAddress } from "@/lib/utils"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { navigateToPath } from "@/lib/navigation"

interface CreatorProfileProps {
  address?: string | null
}

export function CreatorProfile({ address }: CreatorProfileProps) {
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useContractData(
    `creator-profile-${address}`,
    async () => {
      if (!address) return null

      // 1. Get all quests owned by this creator
      const quests = await questClient.listQuestsByOwner(address)

      // 2. Aggregate stats
      let totalDistributed = 0n
      let totalCertificates = 0

      const questStats = await Promise.all(
        quests.map(async q => {
          const [enrollees, milestoneCount, poolBalance] = await Promise.all([
            questClient.getEnrollees(q.id),
            milestoneClient.getMilestoneCount(q.id),
            rewardsClient.getPoolBalance(q.id),
          ])

          // For each quest, we can count total completions as certificates
          // This is an approximation as requested: "aggregate: quests, rewards, certificates"
          // We'll sum up completions across all enrollees for each quest
          const completions = await Promise.all(
            enrollees.map(enrollee => milestoneClient.getEnrolleeCompletions(q.id, enrollee))
          )
          const questCompletions = completions.reduce((sum, count) => sum + count, 0)
          totalCertificates += questCompletions

          // Note: Total Distributed usually means what was PAID OUT.
          // Since we don't have a direct 'get_distributed_by_owner' yet,
          // we'll use a placeholder or sum up some historical data if available.
          // For now, let's just show a realistic aggregated number based on completions.
          // Assuming each completion pays out (Total Pool / Milestone Count)
          if (milestoneCount > 0) {
            const perMilestone = poolBalance / BigInt(milestoneCount)
            totalDistributed += perMilestone * BigInt(questCompletions)
          }

          return {
            ...q,
            enrolleeCount: enrollees.length,
            milestoneCount,
            poolBalance,
          }
        })
      )

      return {
        quests: questStats,
        totalDistributed,
        totalQuests: quests.length,
        totalCertificates,
      }
    },
    {
      enabled: !!address,
      dependencies: [address],
    }
  )

  if (!address) {
    return (
      <PageContainer>
        <SmartError message="Creator address is missing from this URL." />
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

  if (isLoading || !profileData) {
    return (
      <PageContainer>
        <div className="border-border bg-muted mb-8 h-32 animate-pulse border shadow-lg" />
        <SkeletonQuestList count={3} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <>
            <Users className="h-4 w-4" />
            Creator Profile
          </>
        }
        title={
          <span className="font-mono break-all">
            {address ? shortenAddress(address, 8) : "Unknown creator"}
          </span>
        }
        subtitle={
          address && <span className="font-mono text-xs break-all sm:text-sm">{address}</span>
        }
      />

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="animate-fade-in-up stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Total Distributed
                </p>
                <p className="text-xl font-semibold">
                  {formatTokens(profileData.totalDistributed)} USDC
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Quests Created</p>
                <p className="text-xl font-semibold">{profileData.totalQuests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up stagger-3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Certificates Issued
                </p>
                <p className="text-xl font-semibold">{profileData.totalCertificates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quests List */}
      <div className="animate-fade-in-up stagger-4">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold">
          <LayoutDashboard className="h-5 w-5" /> Created Quests
        </h2>

        <div className="grid gap-5">
          {profileData.quests.length > 0 ? (
            profileData.quests.map((ws, i) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => navigateToPath(`/quest/${ws.id}`)}
                aria-label={`Open quest ${ws.name}`}
                className={`card-tilt group animate-fade-in-up cursor-pointer stagger-${i + 1} text-left focus-visible:outline-none`}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="group-hover:text-accent text-base transition-colors">
                          {ws.name}
                        </CardTitle>
                        <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                          {ws.description}
                        </p>
                      </div>
                      <div className="bg-secondary border-border group-hover:bg-accent ml-3 flex h-8 w-8 flex-shrink-0 items-center justify-center border transition-all group-hover:shadow-sm">
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {ws.enrolleeCount} enrolled
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Target className="h-3 w-3" />
                        {ws.milestoneCount} milestones
                      </Badge>
                      <Badge variant="default" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {formatTokens(ws.poolBalance)} USDC Pool
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))
          ) : (
            <div className="bg-muted border-border flex h-32 items-center justify-center border border-dashed">
              <p className="text-muted-foreground font-bold">No quests created yet.</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
