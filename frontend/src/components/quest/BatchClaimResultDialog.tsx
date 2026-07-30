import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, CheckCircle2, AlertCircle, Coins, RotateCcw, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatTokens } from "@/lib/utils"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import type { BatchClaimSummary, MilestoneClaimResult } from "@/lib/contract-types"

interface BatchClaimResultDialogProps {
  isOpen: boolean
  summary: BatchClaimSummary | null
  onClose: () => void
  onRetryFailed: (failedResults: MilestoneClaimResult[]) => void
  isRetrying?: boolean
}

export function BatchClaimResultDialog({
  isOpen,
  summary,
  onClose,
  onRetryFailed,
  isRetrying = false,
}: BatchClaimResultDialogProps) {
  const [isClosing, setIsClosing] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll when dialog is open
  useScrollLock(isOpen)

  const handleClose = useCallback(() => {
    if (isRetrying) return
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 150)
  }, [isRetrying, onClose])

  const truncateAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isRetrying) {
        handleClose()
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isRetrying, handleClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement

      const focusTimer = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus()
        }
      }, 100)

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !dialogRef.current) return

        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0] as HTMLElement
        const last = focusable[focusable.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === last) {
            first.focus()
            e.preventDefault()
          }
        }
      }

      window.addEventListener("keydown", handleTabKey)

      return () => {
        clearTimeout(focusTimer)
        window.removeEventListener("keydown", handleTabKey)
        if (previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [isOpen])

  if (!isOpen || !summary) return null

  const failedResults = summary.results.filter(r => r.status === "failed")
  const allSucceeded = summary.failureCount === 0
  const someSucceeded = summary.successCount > 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-result-title"
        aria-describedby="batch-result-description"
        className={cn(
          "animate-fade-in-up relative z-10 w-full max-w-lg px-4",
          isClosing && "scale-95 opacity-0"
        )}
      >
        <Card className="border-border max-h-[85vh] overflow-hidden border shadow-xl">
          {/* Header */}
          <div
            className={cn(
              "border-border flex items-center justify-between border-b px-6 py-4",
              allSucceeded ? "bg-success/10" : someSucceeded ? "bg-warning/10" : "bg-destructive/10"
            )}
          >
            <div className="flex items-center gap-2">
              {allSucceeded ? (
                <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
              ) : someSucceeded ? (
                <AlertCircle className="text-warning h-5 w-5" aria-hidden="true" />
              ) : (
                <AlertCircle className="text-destructive h-5 w-5" aria-hidden="true" />
              )}
              <span
                id="batch-result-title"
                className="text-sm font-semibold tracking-wider uppercase"
              >
                Claim Results
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isRetrying}
              aria-label="Close claim results dialog"
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
            <CardContent className="space-y-4 p-6">
              {/* Summary */}
              <div id="batch-result-description">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Summary
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {summary.successCount} of {summary.results.length} milestones claimed
                  {summary.failureCount > 0 && (
                    <span className="text-muted-foreground ml-1 text-base font-normal">
                      ({summary.failureCount} failed)
                    </span>
                  )}
                </p>
                {summary.totalAmount > 0n && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="success" className="gap-1.5">
                      <Coins className="h-3 w-3" />+{formatTokens(Number(summary.totalAmount))} USDC
                      claimed
                    </Badge>
                  </div>
                )}
                {summary.enrollee && (
                  <p className="text-muted-foreground mt-2 font-mono text-xs">
                    To: {truncateAddress(summary.enrollee)}
                  </p>
                )}
              </div>

              {/* Per-milestone results */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Details
                </p>
                <div className="divide-border max-h-[280px] divide-y overflow-y-auto border-t border-b">
                  {summary.results.map(result => (
                    <div
                      key={result.milestoneId}
                      className={cn(
                        "flex items-start gap-3 px-3 py-3 transition-colors",
                        result.status === "success" ? "bg-success/5" : "bg-destructive/5"
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {result.status === "success" ? (
                          <CheckCircle2 className="text-success h-4 w-4" aria-label="Success" />
                        ) : (
                          <AlertCircle className="text-destructive h-4 w-4" aria-label="Failed" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate text-sm font-semibold">
                            {result.milestoneTitle}
                          </h4>
                          {result.status === "success" && result.rewardAmount !== undefined && (
                            <Badge variant="success" className="shrink-0 gap-1 text-xs">
                              <Coins className="h-3 w-3" />+
                              {formatTokens(Number(result.rewardAmount))} USDC
                            </Badge>
                          )}
                        </div>
                        {result.status === "failed" && result.error && (
                          <p className="text-destructive mt-1 text-xs font-medium">
                            {result.error}
                          </p>
                        )}
                        {result.status === "success" && result.txHash && (
                          <p className="text-muted-foreground mt-1 truncate font-mono text-[10px]">
                            TX: {result.txHash}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </div>

          {/* Actions */}
          <div className="border-border bg-accent/30 flex gap-3 border-t px-6 py-4">
            {failedResults.length > 0 && (
              <Button
                variant="default"
                onClick={() => onRetryFailed(failedResults)}
                disabled={isRetrying}
                className="shimmer-on-hover flex-1 gap-2"
              >
                {isRetrying ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Retry {failedResults.length} failed
                  </>
                )}
              </Button>
            )}
            <Button
              variant={failedResults.length > 0 ? "outline" : "default"}
              onClick={handleClose}
              disabled={isRetrying}
              className={cn("flex-1 gap-2", failedResults.length === 0 && "shimmer-on-hover")}
              ref={closeButtonRef}
            >
              {allSucceeded ? (
                <>
                  <Shield className="h-4 w-4" />
                  Done
                </>
              ) : (
                "Close"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>,
    document.body
  )
}
