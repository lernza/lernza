import { useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Flag, AlertTriangle, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { useFocusTrap } from "@/hooks/use-focus-trap"

export type ReportReason =
  | "spam"
  | "misleading"
  | "offensive"
  | "scam"
  | "inappropriate"
  | "other"

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam or misleading content" },
  { value: "misleading", label: "Misleading description or rewards" },
  { value: "offensive", label: "Offensive or harmful content" },
  { value: "scam", label: "Suspected scam or fraud" },
  { value: "inappropriate", label: "Inappropriate language or imagery" },
  { value: "other", label: "Other policy violation" },
]

interface ReportQuestDialogProps {
  isOpen: boolean
  questId: number
  questName: string
  onClose: () => void
}

export function ReportQuestDialog({ isOpen, questId, questName, onClose }: ReportQuestDialogProps) {
  const [reason, setReason] = useState<ReportReason | "">("")
  const [details, setDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const firstReasonRef = useRef<HTMLInputElement>(null)

  useScrollLock(isOpen)

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setReason("")
      setDetails("")
      setIsSubmitted(false)
      onClose()
    }, 150)
  }, [onClose])

  // A report is already in flight, so Escape must not dismiss the dialog out
  // from under the user.
  const handleEscape = useCallback(() => {
    if (isSubmitting) return
    handleClose()
  }, [handleClose, isSubmitting])

  useFocusTrap(dialogRef, {
    isActive: isOpen,
    onEscape: handleEscape,
    initialFocusRef: firstReasonRef,
  })

  const handleSubmit = useCallback(async () => {
    if (!reason) return
    setIsSubmitting(true)

    await new Promise(resolve => setTimeout(resolve, 800))

    console.log("Quest report submitted:", { questId, reason, details })

    setIsSubmitting(false)
    setIsSubmitted(true)
  }, [reason, details, questId])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        aria-describedby="report-dialog-description"
        // Fallback so the container can take focus when it holds no focusable
        // children, and so the trap never strands focus on <body>.
        tabIndex={-1}
        className={cn(
          "animate-fade-in-up relative z-10 w-full max-w-md px-4 focus:outline-none",
          isClosing && "scale-95 opacity-0"
        )}
      >
        <Card className="border-border overflow-hidden border shadow-xl">
          <div className="bg-destructive/10 border-border flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <Flag className="text-destructive h-5 w-5" aria-hidden="true" />
              <span id="report-dialog-title" className="text-sm font-semibold tracking-wider uppercase">
                Report Quest
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Close report dialog"
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <CardContent className="space-y-4 p-6">
            {isSubmitted ? (
              <div className="py-4 text-center">
                <AlertTriangle className="text-success mx-auto mb-3 h-10 w-10" />
                <p className="text-lg font-semibold">Report Submitted</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Thank you for reporting "{questName}". Our moderation team will review it.
                </p>
                <Button onClick={handleClose} className="mt-4 shimmer-on-hover">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Quest
                  </p>
                  <p className="mt-1 text-sm font-semibold">{questName}</p>
                  <p id="report-dialog-description" className="text-muted-foreground mt-1 text-sm">
                    Choose a reason so our moderation team can review this quest.
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Reason for reporting
                  </p>
                  <div className="mt-2 space-y-2">
                    {REPORT_REASONS.map((r, index) => (
                      <label
                        key={r.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 border p-3 transition-all",
                          reason === r.value
                            ? "border-destructive bg-destructive/5 shadow-sm"
                            : "border-border hover:border-border hover:bg-muted/50"
                        )}
                      >
                        <input
                          ref={index === 0 ? firstReasonRef : undefined}
                          type="radio"
                          name="report-reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={() => setReason(r.value)}
                          className="accent-destructive"
                        />
                        <span className="text-sm font-medium">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Additional details (optional)
                  </p>
                  <textarea
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    placeholder="Provide any context that will help our moderation team..."
                    rows={3}
                    className="border-border bg-background mt-2 w-full resize-none border p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSubmit}
                    disabled={!reason || isSubmitting}
                    className="flex-1 gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Report
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>,
    document.body
  )
}
