import { Users, Plus, Trash2, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VirtualList } from "@/components/ui/virtual-list"
import { useTranslation } from "@/i18n"

/** Above this many enrollees the list switches to windowed rendering. */
const VIRTUALIZE_THRESHOLD = 20

interface Enrollee {
  id: number
  address: string
  name?: string
}

interface Milestone {
  id: number
  title: string
  rewardAmount: number
}

interface Completion {
  milestoneId: number
  completed: boolean
}

interface EnrolleesSectionProps {
  enrollees: Enrollee[]
  milestones: Milestone[]
  completions: Completion[]
  onAddEnrollee: () => void
  /** Called when user clicks "Claim Rewards" for a specific enrollee. */
  onClaimRewards?: (enrollee: Enrollee, claimableMilestones: Milestone[]) => void
  /** Whether batch claiming is currently in progress. */
  isClaiming?: boolean
  /** Called when the quest owner requests removal of an enrollee. */
  onRemoveEnrollee?: (enrollee: Enrollee) => void
}

export function EnrolleesSection({
  enrollees,
  milestones,
  completions,
  onAddEnrollee,
  onClaimRewards,
  isClaiming = false,
  onRemoveEnrollee,
}: EnrolleesSectionProps) {
  const { t } = useTranslation()

  if (enrollees.length === 0) {
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center border p-12 shadow-md">
        <Users className="text-muted-foreground mb-3 h-8 w-8" />
        <p className="text-muted-foreground mb-4">{t("enrollees.empty")}</p>
        <Button onClick={onAddEnrollee} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("enrollees.addFirst")}
        </Button>
      </div>
    )
  }

  const renderEnrollee = (enrollee: Enrollee) => {
    const enrolleeCompletions = completions.filter(
      c => c.completed && milestones.some(m => m.id === c.milestoneId)
    )
    const completedCount = enrolleeCompletions.length
    const progressPercent = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0
    const earned = milestones
      .filter((_, i) => i < completedCount)
      .reduce((sum, m) => sum + m.rewardAmount, 0)

    return (
      <div className="border-border bg-card flex flex-col gap-4 border p-5 shadow-md sm:flex-row sm:items-center sm:justify-between">
        {/* Enrollee info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{enrollee.name || t("enrollees.unnamed")}</h3>
          <p className="text-muted-foreground mt-1 truncate font-mono text-sm">{enrollee.address}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="bg-muted h-1 w-32 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums">
              {completedCount}/{milestones.length}
            </span>
          </div>
        </div>

        {/* Earned reward & actions */}
        <div className="flex items-center gap-4 sm:justify-end">
          {milestones.length > 0 && completedCount > 0 && (
            <>
              <Badge variant="secondary">{t("enrollees.earned", { count: earned })}</Badge>
              {onClaimRewards && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isClaiming}
                  onClick={() => {
                    const claimable = milestones.filter((_, i) => i < completedCount)
                    onClaimRewards(enrollee, claimable)
                  }}
                  className="gap-1.5"
                >
                  <Coins className="h-4 w-4" />
                  {t("enrollees.collectRewards")}
                </Button>
              )}
            </>
          )}
          {onRemoveEnrollee && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("enrollees.remove", {
                name: enrollee.name || enrollee.address
              })}
              title={t("enrollees.removalNotice")}
              onClick={() => onRemoveEnrollee(enrollee)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 text-muted-foreground border px-4 py-3 text-sm">
        {t("enrollees.removalNotice")}
      </div>

      {enrollees.length > VIRTUALIZE_THRESHOLD ? (
        <VirtualList
          items={enrollees}
          getKey={enrollee => String(enrollee.id)}
          estimateSize={() => 128}
          height={560}
          itemClassName="py-1.5"
          renderItem={renderEnrollee}
        />
      ) : (
        <div className="space-y-3">
          {enrollees.map(enrollee => (
            <div key={enrollee.id}>{renderEnrollee(enrollee)}</div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={onAddEnrollee} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("enrollees.add")}
        </Button>
      </div>
    </div>
  )
}
