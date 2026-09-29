import { useState } from "react"
import { Gavel, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MAX_DISPUTE_REASON_LEN, type DisputeOutcome } from "@/lib/contracts/milestone-client"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

/**
 * Collects a learner's justification for disputing a rejected milestone
 * submission, and lets a resolver rule on an open dispute. Issue #1614.
 */

interface OpenDisputeDialogProps {
  open: boolean
  milestoneTitle: string
  /** Rejection feedback the learner is appealing, shown for context. */
  rejectionFeedback?: string
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending?: boolean
  /** Seconds still to wait before another dispute is allowed, or 0. */
  cooldownSeconds?: number
}

export function OpenDisputeDialog({
  open,
  milestoneTitle,
  rejectionFeedback,
  onClose,
  onConfirm,
  isPending = false,
  cooldownSeconds = 0,
}: OpenDisputeDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("")

  if (!open) return null

  const trimmed = reason.trim()
  const tooLong = trimmed.length > MAX_DISPUTE_REASON_LEN
  const canSubmit = trimmed.length > 0 && !tooLong && !isPending && cooldownSeconds <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-dialog-title"
        className="border-border bg-background animate-scale-in relative z-10 w-full max-w-lg border shadow-2xl"
      >
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            <span
              id="dispute-dialog-title"
              className="text-sm font-semibold tracking-wider uppercase"
            >
              {t("quest.dispute.openTitle")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-destructive cursor-pointer transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div>
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {t("quest.dispute.milestone")}
            </p>
            <p className="mt-1 text-base font-semibold">{milestoneTitle}</p>
          </div>

          {rejectionFeedback && (
            <div className="bg-muted/50 border-border border p-3">
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                {t("quest.dispute.originalFeedback")}
              </p>
              <p className="mt-1 text-sm">{rejectionFeedback}</p>
            </div>
          )}

          {cooldownSeconds > 0 && (
            <p className="text-warning text-xs font-semibold" role="status">
              {t("quest.dispute.cooldown", { minutes: Math.ceil(cooldownSeconds / 60) })}
            </p>
          )}

          <div>
            <label htmlFor="dispute-reason" className="mb-1.5 block text-sm font-semibold">
              {t("quest.dispute.reasonLabel")}
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <textarea
              id="dispute-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              maxLength={MAX_DISPUTE_REASON_LEN}
              placeholder={t("quest.dispute.reasonPlaceholder")}
              aria-invalid={tooLong}
              className={cn(
                "border-border bg-background w-full resize-none border px-3 py-2 text-sm",
                tooLong && "border-destructive"
              )}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-destructive text-xs font-bold" role="alert">
                {tooLong ? t("quest.dispute.reasonTooLong") : ""}
              </p>
              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                {trimmed.length}/{MAX_DISPUTE_REASON_LEN}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-secondary border-border flex items-center justify-end gap-3 border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={!canSubmit}
            className="shimmer-on-hover"
          >
            <Gavel className="h-4 w-4" />
            {isPending ? t("quest.dispute.submitting") : t("quest.dispute.submit")}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ResolveDisputeDialogProps {
  open: boolean
  milestoneTitle: string
  disputeReason: string
  /** True when the connected wallet is the contract admin (may escalate). */
  canEscalate?: boolean
  onClose: () => void
  onConfirm: (outcome: DisputeOutcome, note?: string) => void
  isPending?: boolean
}

const OUTCOMES: { value: DisputeOutcome; labelKey: "quest.dispute.upheld" | "quest.dispute.overturned" | "quest.dispute.escalated"; hintKey: "quest.dispute.upheldHint" | "quest.dispute.overturnedHint" | "quest.dispute.escalatedHint" }[] = [
  { value: "upheld", labelKey: "quest.dispute.upheld", hintKey: "quest.dispute.upheldHint" },
  {
    value: "overturned",
    labelKey: "quest.dispute.overturned",
    hintKey: "quest.dispute.overturnedHint",
  },
  {
    value: "escalated",
    labelKey: "quest.dispute.escalated",
    hintKey: "quest.dispute.escalatedHint",
  },
]

export function ResolveDisputeDialog({
  open,
  milestoneTitle,
  disputeReason,
  canEscalate = false,
  onClose,
  onConfirm,
  isPending = false,
}: ResolveDisputeDialogProps) {
  const { t } = useTranslation()
  const [outcome, setOutcome] = useState<DisputeOutcome>("upheld")
  const [note, setNote] = useState("")

  if (!open) return null

  const options = OUTCOMES.filter(o => o.value !== "escalated" || canEscalate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-dispute-title"
        className="border-border bg-background animate-scale-in relative z-10 w-full max-w-lg border shadow-2xl"
      >
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            <span
              id="resolve-dispute-title"
              className="text-sm font-semibold tracking-wider uppercase"
            >
              {t("quest.dispute.resolveTitle")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-destructive cursor-pointer transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div>
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {t("quest.dispute.milestone")}
            </p>
            <p className="mt-1 text-base font-semibold">{milestoneTitle}</p>
          </div>

          <div className="bg-muted/50 border-border border p-3">
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {t("quest.dispute.learnerReason")}
            </p>
            <p className="mt-1 text-sm">{disputeReason}</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              {t("quest.dispute.outcomeLabel")}
            </legend>
            <div className="space-y-2">
              {options.map(option => (
                <label
                  key={option.value}
                  className={cn(
                    "border-border hover:bg-secondary flex cursor-pointer items-start gap-2 border p-3 transition-colors",
                    outcome === option.value && "bg-accent/40 border-accent"
                  )}
                >
                  <input
                    type="radio"
                    name="disputeOutcome"
                    value={option.value}
                    checked={outcome === option.value}
                    onChange={() => setOutcome(option.value)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t(option.labelKey)}</span>
                    <span className="text-muted-foreground block text-xs">
                      {t(option.hintKey)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="dispute-note" className="mb-1.5 block text-sm font-semibold">
              {t("quest.dispute.noteLabel")}
            </label>
            <textarea
              id="dispute-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              maxLength={MAX_DISPUTE_REASON_LEN}
              placeholder={t("quest.dispute.notePlaceholder")}
              className="border-border bg-background w-full resize-none border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="bg-secondary border-border flex items-center justify-end gap-3 border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(outcome, note.trim() || undefined)}
            disabled={isPending}
            className="shimmer-on-hover"
          >
            {isPending ? t("quest.dispute.resolving") : t("quest.dispute.resolve")}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Compact status pill for a dispute awaiting or holding a ruling. */
export function DisputeStatusBadge({ status }: { status: "pending" | "escalated" | "upheld" | "overturned" }) {
  const { t } = useTranslation()
  const variant = status === "overturned" ? "success" : status === "upheld" ? "secondary" : "outline"
  return (
    <Badge variant={variant} className="gap-1 text-[10px]">
      {t(`quest.dispute.status.${status}` as const)}
    </Badge>
  )
}
