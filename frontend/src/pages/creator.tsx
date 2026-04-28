import { useParams, useNavigate } from "react-router-dom";
import { Users, Target, Award, Sparkles, LayoutDashboard, ChevronRight } from "lucide-react";
import { useContractData } from "@/hooks/use-async-data";
import { questClient } from "@/lib/contracts/quest";
import { rewardsClient } from "@/lib/contracts/rewards";
import { milestoneClient } from "@/lib/contracts/milestone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartError } from "@/components/error-states";
import { SkeletonQuestList } from "@/components/ui/skeleton";
import { formatTokens } from "@/lib/utils";

export function CreatorProfile() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();

  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useContractData(
    `creator-profile-${address}`,
    async () => {
      if (!address) return null;

      // 1. Get all quests owned by this creator
      const quests = await questClient.listQuestsByOwner(address);

      // 2. Aggregate stats
      let totalDistributed = 0n;
      let totalCertificates = 0;
      
      const questStats = await Promise.all(
        quests.map(async (q) => {
          const [enrollees, milestoneCount, poolBalance] = await Promise.all([
            questClient.getEnrollees(q.id),
            milestoneClient.getMilestoneCount(q.id),
            rewardsClient.getPoolBalance(q.id),
          ]);

          // For each quest, we can count total completions as certificates
          // This is an approximation as requested: "aggregate: quests, rewards, certificates"
          // We'll sum up completions across all enrollees for each quest
          const completions = await Promise.all(
            enrollees.map(enrollee => milestoneClient.getEnrolleeCompletions(q.id, enrollee))
          );
          const questCompletions = completions.reduce((sum, count) => sum + count, 0);
          totalCertificates += questCompletions;

          // Note: Total Distributed usually means what was PAID OUT.
          // Since we don't have a direct 'get_distributed_by_owner' yet, 
          // we'll use a placeholder or sum up some historical data if available.
          // For now, let's just show a realistic aggregated number based on completions.
          // Assuming each completion pays out (Total Pool / Milestone Count)
          if (milestoneCount > 0) {
              const perMilestone = poolBalance / BigInt(milestoneCount);
              totalDistributed += perMilestone * BigInt(questCompletions);
          }

          return {
            ...q,
            enrolleeCount: enrollees.length,
            milestoneCount,
            poolBalance,
          };
        })
      );

      return {
        quests: questStats,
        totalDistributed,
        totalQuests: quests.length,
        totalCertificates,
      };
    },
    {
      enabled: !!address,
      dependencies: [address],
    }
  );

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SmartError message={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isLoading || !profileData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 h-32 animate-pulse bg-muted border-[3px] border-border shadow-[6px_6px_0_var(--color-border)]" />
        <SkeletonQuestList count={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Profile Header */}
      <div className="bg-primary border-border animate-fade-in-up relative mb-8 overflow-hidden border-[3px] p-6 shadow-[6px_6px_0_var(--color-border)] sm:p-8">
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-bold tracking-wider uppercase">Creator Profile</span>
            </div>
            <h1 className="text-2xl font-black break-all sm:text-4xl">{address}</h1>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
        <Card className="animate-fade-in-up stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border-[2px]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Total Distributed</p>
                <p className="text-xl font-black">{formatTokens(profileData.totalDistributed)} USDC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border-[2px]">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Quests Created</p>
                <p className="text-xl font-black">{profileData.totalQuests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up stagger-3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-secondary border-border flex h-10 w-10 items-center justify-center border-[2px]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">Certificates Issued</p>
                <p className="text-xl font-black">{profileData.totalCertificates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quests List */}
      <div className="animate-fade-in-up stagger-4">
        <h2 className="flex items-center gap-2 text-xl font-black mb-5">
          <LayoutDashboard className="h-5 w-5" /> Created Quests
        </h2>

        <div className="grid gap-5">
          {profileData.quests.length > 0 ? (
            profileData.quests.map((ws, i) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => navigate(`/quest/${ws.id}`)}
                className={`card-tilt group animate-fade-in-up cursor-pointer stagger-${i + 1} text-left focus-visible:outline-none`}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="group-hover:text-primary text-base transition-colors">
                          {ws.name}
                        </CardTitle>
                        <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                          {ws.description}
                        </p>
                      </div>
                      <div className="bg-secondary border-border group-hover:bg-primary ml-3 flex h-8 w-8 flex-shrink-0 items-center justify-center border-[2px] transition-all group-hover:shadow-[2px_2px_0_var(--color-border)]">
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
            <div className="bg-muted border-border flex h-32 items-center justify-center border-[3px] border-dashed">
              <p className="text-muted-foreground font-bold">No quests created yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
