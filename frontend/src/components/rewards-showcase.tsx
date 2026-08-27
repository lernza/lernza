import { Coins, Calendar, Eye, Lock, Users, Trash2, TrendingUp } from "lucide-react"
import type { RewardShowcase, PrivacyLevel, ShowcaseSettings } from "@/lib/profile-types"
import { PrivacyLevel as PL } from "@/lib/profile-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTokens } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { TransactionLink } from "@/components/TransactionLink"

interface RewardsShowcaseProps {
  rewards: RewardShowcase[]
  showcaseSettings: ShowcaseSettings
  viewerIsOwner: boolean
  onToggleShow?: (show: boolean) => void
  onChangeGlobalPrivacy?: (privacy: PrivacyLevel) => void
  onDeleteReward?: (rewardId: string) => void
  onChangeRewardPrivacy?: (rewardId: string, privacy: PrivacyLevel) => void
}

function PrivacyIcon({ level }: { level: PrivacyLevel }) {
  if (level === PL.Public) return <Eye className="h-3 w-3" />
  if (level === PL.Connections) return <Users className="h-3 w-3" />
  return <Lock className="h-3 w-3" />
}

export function RewardsShowcase({
  rewards,
  showcaseSettings,
  viewerIsOwner,
  onToggleShow,
  onChangeGlobalPrivacy,
  onDeleteReward,
  onChangeRewardPrivacy,
}: RewardsShowcaseProps) {
  const visibleRewards = viewerIsOwner ? rewards : rewards.filter(r => r.privacy === PL.Public)

  const sortedRewards = [...visibleRewards].sort((a, b) => b.earnedAt - a.earnedAt)

  const totalAmount = visibleRewards.reduce((sum, r) => sum + r.amount, 0n)
  const formattedTotal = formatTokens(Number(totalAmount), 7, "USDC")

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="bg-accent/5 border-border flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-success border-border flex h-9 w-9 items-center justify-center border shadow-sm">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              Rewards Earned
              <Badge variant="outline" className="border text-xs font-bold tabular-nums">
                {rewards.length} rewards
              </Badge>
            </CardTitle>
            <p className="text-muted-foreground text-xs font-bold">
              Display milestone rewards you have earned from quests
            </p>
          </div>
        </div>

        {viewerIsOwner && (
          <div className="flex flex-wrap items-center gap-2">
            {onToggleShow && (
              <Button
                variant={showcaseSettings.showRewards ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleShow(!showcaseSettings.showRewards)}
                className="gap-1 text-xs font-bold"
              >
                {showcaseSettings.showRewards ? (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Showing
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Hidden
                  </>
                )}
              </Button>
            )}
            {onChangeGlobalPrivacy && (
              <div className="border-border flex gap-0 border shadow-sm">
                {(
                  [
                    { lvl: PL.Public, Icon: Eye, label: "All Public" },
                    { lvl: PL.Connections, Icon: Users, label: "Connections" },
                    { lvl: PL.Private, Icon: Lock, label: "All Private" },
                  ] as const
                ).map(({ lvl, Icon, label }) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeGlobalPrivacy(lvl)}
                    className={cn(
                      "border-border border-r px-2 py-1.5 text-xs font-bold transition-colors last:border-r-0",
                      showcaseSettings.rewardsPrivacy === lvl
                        ? "bg-accent"
                        : "bg-background hover:bg-secondary text-muted-foreground"
                    )}
                    title={label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {!showcaseSettings.showRewards && viewerIsOwner ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Lock className="text-muted-foreground mb-3 h-10 w-10" />
            <h3 className="mb-1 font-semibold">Rewards showcase hidden</h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-sm font-bold">
              Your rewards are currently hidden from your profile. Toggle the switch above to
              display them.
            </p>
            {onToggleShow && (
              <Button onClick={() => onToggleShow(true)} size="sm">
                <Eye className="h-4 w-4" />
                Show Rewards
              </Button>
            )}
          </div>
        ) : !showcaseSettings.showRewards && !viewerIsOwner ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Lock className="text-muted-foreground mb-3 h-10 w-10 opacity-50" />
            <p className="text-muted-foreground text-sm font-bold">
              This learner has not made their rewards visible.
            </p>
          </div>
        ) : sortedRewards.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Coins className="text-muted-foreground mb-3 h-10 w-10 opacity-50" />
            <h3 className="mb-1 font-semibold">No rewards showcased yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm font-bold">
              {viewerIsOwner
                ? "Complete milestones and earn rewards to see them here. You can choose which rewards to display publicly."
                : "This learner hasn't added any rewards to their showcase yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-success/5 border-border flex items-center justify-between border p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-success border-border flex h-10 w-10 items-center justify-center border shadow-sm">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Total Showcased Rewards
                  </p>
                  <p className="text-success text-2xl font-semibold tabular-nums">
                    {formattedTotal}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="success" className="gap-1 font-bold shadow-sm">
                  <TrendingUp className="h-3 w-3" />
                  {sortedRewards.length} milestone{sortedRewards.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              {sortedRewards.map(reward => {
                const formattedAmount = formatTokens(Number(reward.amount), 7, "USDC")
                return (
                  <div
                    key={reward.id}
                    className="border-border group hover:bg-secondary/30 flex flex-col gap-3 border p-4 shadow-sm transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="bg-success/10 border-border flex h-10 w-10 shrink-0 items-center justify-center border shadow-sm">
                        <Coins className="text-success h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{reward.milestoneTitle}</p>
                          <Badge
                            variant="secondary"
                            className="max-w-[150px] truncate text-[10px] font-bold"
                          >
                            {reward.questName}
                          </Badge>
                          {viewerIsOwner && (
                            <Badge variant="outline" className="gap-1 border text-[10px] font-bold">
                              <PrivacyIcon level={reward.privacy} />
                              {reward.privacy}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                            <span className="text-muted-foreground font-bold">
                              {new Date(reward.earnedAt).toLocaleDateString([], {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          {reward.txHash && viewerIsOwner && (
                            <TransactionLink
                              txHash={reward.txHash}
                              status="confirmed"
                              label="View tx"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-2">
                      <Badge
                        variant="success"
                        className="gap-1 text-sm font-bold tabular-nums shadow-sm"
                      >
                        +{formattedAmount}
                      </Badge>
                      {viewerIsOwner && (
                        <div className="flex items-center gap-1">
                          {onChangeRewardPrivacy && (
                            <div className="border-border flex gap-0 border shadow-sm">
                              {([PL.Public, PL.Connections, PL.Private] as const).map(lvl => {
                                const isActive = reward.privacy === lvl
                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => onChangeRewardPrivacy(reward.id, lvl)}
                                    className={cn(
                                      "border-border border-r p-1.5 transition-colors last:border-r-0",
                                      isActive
                                        ? "bg-accent"
                                        : "bg-background hover:bg-secondary text-muted-foreground"
                                    )}
                                    title={`Set reward to ${lvl}`}
                                  >
                                    <PrivacyIcon level={lvl} />
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          {onDeleteReward && (
                            <button
                              type="button"
                              onClick={() => onDeleteReward(reward.id)}
                              className="text-destructive border-border hover:bg-destructive/10 border p-1.5 transition-colors"
                              title="Remove from showcase"
                              aria-label="Remove reward from showcase"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
