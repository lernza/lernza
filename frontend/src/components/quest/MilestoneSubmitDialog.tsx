import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface SubmissionEvidence {
  url: string
  note: string
  criteriaMet?: number
}

interface MilestoneSubmitDialogProps {
  open: boolean
  milestoneTitle: string
  onConfirm: (evidence: SubmissionEvidence) => void
  onCancel: () => void
  isPending?: boolean
  maxCriteria?: number
}

/**
 * Validates if the given string is a well-formed HTTP or HTTPS URL.
 * Empty string is considered valid since evidence URL is optional.
 */
export function isValidEvidenceUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Dialog that collects learner milestone submission evidence (URL + note) before marking
 * a milestone as complete. Evidence is passed to the caller via onConfirm so it
 * can be stored alongside the milestone completion record.
 *
 * Resolves issue #1448, #1677, and #1613.
 */
export function MilestoneSubmitDialog({
  open,
  milestoneTitle,
  onConfirm,
  onCancel,
  isPending = false,
  maxCriteria,
}: MilestoneSubmitDialogProps) {
  const [url, setUrl] = useState("")
  const [note, setNote] = useState("")
  const [criteriaMet, setCriteriaMet] = useState<number | "">(maxCriteria || "")
  const [touched, setTouched] = useState(false)

  const isUrlValid = useMemo(() => isValidEvidenceUrl(url), [url])
  const isCriteriaValid = useMemo(() => {
    if (maxCriteria === undefined || maxCriteria <= 0) return true
    if (typeof criteriaMet !== "number" || isNaN(criteriaMet)) return false
    return criteriaMet >= 1 && criteriaMet <= maxCriteria
  }, [criteriaMet, maxCriteria])

  const showError = touched && url.trim().length > 0 && !isUrlValid

  function handleConfirm() {
    if (!isUrlValid || !isCriteriaValid) return
    onConfirm({
      url: url.trim(),
      note: note.trim(),
      criteriaMet: typeof criteriaMet === "number" ? criteriaMet : undefined,
    })
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onCancel()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit milestone evidence</DialogTitle>
          <DialogDescription>
            Provide a link and a short note explaining how you completed{" "}
            <strong>{milestoneTitle}</strong>. Both fields are optional but help
            owners and reviewers verify your work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {maxCriteria !== undefined && maxCriteria > 0 && (
            <div className="space-y-1">
              <label htmlFor="criteria-met" className="text-sm font-medium">
                Criteria Met (1 to {maxCriteria})
              </label>
              <input
                id="criteria-met"
                type="number"
                min={1}
                max={maxCriteria}
                value={criteriaMet}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setCriteriaMet(isNaN(val) ? "" : val)
                }}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending}
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="evidence-url" className="text-sm font-medium">
              Evidence URL
            </label>
            <input
              id="evidence-url"
              type="url"
              placeholder="https://github.com/you/project"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (!touched) setTouched(true)
              }}
              onBlur={() => setTouched(true)}
              className={`border-input bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                showError
                  ? "border-destructive focus-visible:ring-destructive"
                  : "focus-visible:ring-ring"
              }`}
              disabled={isPending}
            />
            {showError && (
              <p className="text-destructive text-xs font-semibold mt-1">
                Please enter a valid HTTP or HTTPS URL (e.g. https://github.com/...).
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="evidence-note" className="text-sm font-medium">
              Note
            </label>
            <textarea
              id="evidence-note"
              rows={3}
              placeholder="Describe what you built or link relevant commits…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !isUrlValid || !isCriteriaValid}
          >
            {isPending ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
