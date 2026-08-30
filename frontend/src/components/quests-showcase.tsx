import {
  Trophy,
  Calendar,
  CheckCircle2,
  Coins,
  Star,
  Eye,
  Lock,
  Users,
  Pencil,
  Trash2,
  Sparkles,
  Target,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { CompletedQuestShowcase, PrivacyLevel, ShowcaseSettings } from "@/lib/profile-types"
import { PrivacyLevel as PL } from "@/lib/profile-types"
import { formatTokens } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface QuestShowcaseCardProps {
  quest: CompletedQuestShowcase
  viewerIsOwner: boolean
  onToggleHighlighted?: () => void
  onDelete?: () => void
  onChangePrivacy?: (privacy: PrivacyLevel) => void
  onViewQuest?: () => void
}

function PrivacyBadge({ level }: { level: PrivacyLevel }) {
  const config = {
    [PL.Public]: { icon: Eye, label: "Public", variant: "success" as const },
    [PL.Connections]: { icon: Users, label: "Connections", variant: "secondary" as const },
    [PL.Private]: { icon: Lock, label: "Private", variant: "outline" as const },
  }
  const cfg = config[level]
  const Icon = cfg.icon
  return (
    <Badge variant={cfg.variant} className="gap-1 border font-bold shadow-sm">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  )
}

function QuestShowcaseCard({
  quest,
  viewerIsOwner,
  onToggleHighlighted,
  onDelete,
  onChangePrivacy,
  onViewQuest,
}: QuestShowcaseCardProps) {
  const progressPercent =
    quest.milestoneCount > 0
      ? Math.round((quest.completedMilestones / quest.milestoneCount) * 100)
      : 0

  const formattedRewards =
    quest.totalRewardsEarned > 0n ? formatTokens(Number(quest.totalRewardsEarned), 7, "USDC") : null

  return (
    <Card
      className={cn(
        "border-border group overflow-hidden border shadow-md transition-all hover:shadow-lg",
        quest.highlighted && "border-accent ring-accent/30 ring-1"
      )}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              className={cn(
                "border-border flex h-12 w-12 shrink-0 items-center justify-center border shadow-sm",
                quest.highlighted ? "bg-accent/15 border-accent" : "bg-success/10"
              )}
            >
              {quest.highlighted ? (
                <Sparkles className="text-accent h-5 w-5" />
              ) : (
                <Trophy className="text-success h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h4 className="truncate font-semibold">{quest.questName}</h4>
                {quest.highlighted && (
                  <Badge variant="default" className="gap-1 text-[10px]">
                    <Star className="h-3 w-3 fill-current" />
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                {quest.description || "Quest completed successfully"}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Progress
                  </span>
                  <span className="tabular-nums">
                    {quest.completedMilestones}/{quest.milestoneCount} milestones
                  </span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground font-bold">
                    {new Date(quest.completionDate).toLocaleDateString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {formattedRewards && (
                  <div className="flex items-center gap-1">
                    <Coins className="text-success h-3.5 w-3.5" />
                    <span className="text-success font-bold tabular-nums">{formattedRewards}</span>
                  </div>
                )}
                {progressPercent === 100 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="text-success h-3.5 w-3.5" />
                    <span className="text-success font-bold">Completed</span>
                  </div>
                )}
              </div>

              {quest.reflection && viewerIsOwner && (
                <div className="border-border border-accent bg-accent/5 mt-3 border-l-2 py-1 pl-3">
                  <p className="text-muted-foreground text-xs italic">"{quest.reflection}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 sm:min-w-[140px]">
            <PrivacyBadge level={quest.privacy} />

            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              {viewerIsOwner && (
                <>
                  {onToggleHighlighted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onToggleHighlighted}
                      className={cn(
                        "gap-1 text-xs font-bold",
                        quest.highlighted && "border-accent bg-accent/10 text-accent"
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", quest.highlighted && "fill-current")} />
                      {quest.highlighted ? "Featured" : "Feature"}
                    </Button>
                  )}
                  {onChangePrivacy && (
                    <div className="flex gap-1">
                      {([PL.Public, PL.Connections, PL.Private] as const).map(lvl => {
                        const isActive = quest.privacy === lvl
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => onChangePrivacy(lvl)}
                            className={cn(
                              "border-border border p-1.5 transition-colors",
                              isActive
                                ? "bg-accent border-accent"
                                : "bg-background hover:bg-secondary text-muted-foreground"
                            )}
                            title={`Set to ${lvl}`}
                          >
                            {lvl === PL.Public && <Eye className="h-3.5 w-3.5" />}
                            {lvl === PL.Connections && <Users className="h-3.5 w-3.5" />}
                            {lvl === PL.Private && <Lock className="h-3.5 w-3.5" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDelete}
                      className="text-destructive hover:bg-destructive/10 gap-1 text-xs font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </>
              )}
              {onViewQuest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewQuest}
                  className="gap-1 text-xs font-bold"
                >
                  View Quest
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface CompletedQuestsShowcaseProps {
  quests: CompletedQuestShowcase[]
  showcaseSettings: ShowcaseSettings
  viewerIsOwner: boolean
  onToggleShow?: (show: boolean) => void
  onChangeGlobalPrivacy?: (privacy: PrivacyLevel) => void
  onToggleQuestHighlighted?: (questId: number) => void
  onDeleteQuest?: (questId: number) => void
  onChangeQuestPrivacy?: (questId: number, privacy: PrivacyLevel) => void
  onAddQuest?: () => void
  onViewQuest?: (questId: number) => void
  isLoading?: boolean
}

export function CompletedQuestsShowcase({
  quests,
  showcaseSettings,
  viewerIsOwner,
  onToggleShow,
  onChangeGlobalPrivacy,
  onToggleQuestHighlighted,
  onDeleteQuest,
  onChangeQuestPrivacy,
  onAddQuest,
  onViewQuest,
}: CompletedQuestsShowcaseProps) {
  const visibleQuests = viewerIsOwner ? quests : quests.filter(q => q.privacy === PL.Public)

  const sortedQuests = [...visibleQuests].sort((a, b) => {
    if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1
    return b.completionDate - a.completionDate
  })

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="bg-success/5 border-border flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-success border-border flex h-9 w-9 items-center justify-center border shadow-sm">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              Completed Quests
              <Badge variant="outline" className="border text-xs font-bold tabular-nums">
                {quests.length} total
              </Badge>
            </CardTitle>
            <p className="text-muted-foreground text-xs font-bold">
              Showcase the quests you have successfully completed
            </p>
          </div>
        </div>

        {viewerIsOwner && (
          <div className="flex flex-wrap items-center gap-2">
            {onToggleShow && (
              <Button
                variant={showcaseSettings.showCompletedQuests ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleShow(!showcaseSettings.showCompletedQuests)}
                className="gap-1 text-xs font-bold"
              >
                {showcaseSettings.showCompletedQuests ? (
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
                      showcaseSettings.questsPrivacy === lvl
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
            {onAddQuest && (
              <Button size="sm" onClick={onAddQuest} className="gap-1 text-xs font-bold">
                <Pencil className="h-3.5 w-3.5" />
                Add
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5">
        {!showcaseSettings.showCompletedQuests && viewerIsOwner ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Lock className="text-muted-foreground mb-3 h-10 w-10" />
            <h3 className="mb-1 font-semibold">Quest showcase hidden</h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-sm font-bold">
              Your completed quests are currently hidden from your profile. Toggle the switch above
              to display them.
            </p>
            {onToggleShow && (
              <Button onClick={() => onToggleShow(true)} size="sm">
                <Eye className="h-4 w-4" />
                Show Quest Showcase
              </Button>
            )}
          </div>
        ) : !showcaseSettings.showCompletedQuests && !viewerIsOwner ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Lock className="text-muted-foreground mb-3 h-10 w-10 opacity-50" />
            <p className="text-muted-foreground text-sm font-bold">
              This learner has not made their completed quests visible.
            </p>
          </div>
        ) : sortedQuests.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Trophy className="text-muted-foreground mb-3 h-10 w-10 opacity-50" />
            <h3 className="mb-1 font-semibold">No quests showcased yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-sm font-bold">
              {viewerIsOwner
                ? "Complete quests and add them to your profile to showcase your achievements to others."
                : "This learner hasn't added any completed quests to their showcase yet."}
            </p>
            {viewerIsOwner && onAddQuest && (
              <Button size="sm" onClick={onAddQuest}>
                <Pencil className="h-4 w-4" />
                Add Completed Quest
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedQuests.map(quest => (
              <QuestShowcaseCard
                key={quest.questId}
                quest={quest}
                viewerIsOwner={viewerIsOwner}
                onToggleHighlighted={
                  onToggleQuestHighlighted
                    ? () => onToggleQuestHighlighted(quest.questId)
                    : undefined
                }
                onDelete={onDeleteQuest ? () => onDeleteQuest(quest.questId) : undefined}
                onChangePrivacy={
                  onChangeQuestPrivacy ? p => onChangeQuestPrivacy(quest.questId, p) : undefined
                }
                onViewQuest={onViewQuest ? () => onViewQuest(quest.questId) : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
