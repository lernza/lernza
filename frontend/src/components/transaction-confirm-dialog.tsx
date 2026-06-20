import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Shield, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatTokens } from "@/lib/utils"
import { useScrollLock } from "@/hooks/use-scroll-lock"

export interface TransactionDetails {
  actionName: string
  fromAddress?: string
  toAddress?: string
  estimatedFee?: string
  tokenAmount?: bigint
  tokenSymbol?: string
  description?: string
}

interface TransactionConfirmDialogProps {
  isOpen: boolean
  details: TransactionDetails | null
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

export function TransactionConfirmDialog({
  isOpen,
  details,
  onConfirm,
  onCancel,
  isPending = false,
}: TransactionConfirmDialogProps) {
  const [isClosing, setIsClosing] = useState(false)
  const actionLabel = details?.actionName ?? "confirm this transaction"

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll when dialog is open
  useScrollLock(isOpen)

  const handleClose = useCallback(() => {
    if (isPending) return
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onCancel()
    }, 150)
  }, [isPending, onCancel])

  const truncateAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPending) {
        handleClose()
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isPending, handleClose])

  // Handle Focus Management
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the primary action button after a brief delay to ensure it's rendered
      const focusTimer = setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus()
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
        // Restore focus to the previously focused element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [isOpen])

  if (!isOpen || !details) return null

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
        aria-labelledby="tx-dialog-title"
        aria-describedby="tx-dialog-description"
        className={cn(
          "animate-fade-in-up relative z-10 w-full max-w-md px-4",
          isClosing && "scale-95 opacity-0"
        )}
      >
        <Card className="border-border overflow-hidden border shadow-xl">
          {/* Header */}
          <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" aria-hidden="true" />
              <span id="tx-dialog-title" className="text-sm font-semibold tracking-wider uppercase">
                Confirm Transaction
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <CardContent className="space-y-4 p-6">
            {/* Action Name */}
            <div id="tx-dialog-description">
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Action
              </p>
              <p className="mt-1 text-lg font-semibold">{details.actionName}</p>
            </div>

            {/* Description */}
            {details.description && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-muted-foreground text-sm">{details.description}</p>
              </div>
            )}

            {/* Addresses */}
            {(details.fromAddress || details.toAddress) && (
              <div className="space-y-2">
                {details.fromAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-bold">From:</span>
                    <Badge variant="outline" className="font-mono">
                      {truncateAddress(details.fromAddress)}
                    </Badge>
                  </div>
                )}
                {details.toAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-bold">To:</span>
                    <Badge variant="outline" className="font-mono">
                      {truncateAddress(details.toAddress)}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Token Amount */}
            {details.tokenAmount !== undefined && details.tokenSymbol && (
              <div className="border-accent/20 bg-accent/5 rounded-md border-2 p-3">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Amount
                </p>
                <p className="text-accent mt-1 text-2xl font-semibold">
                  {formatTokens(Number(details.tokenAmount))} {details.tokenSymbol}
                </p>
              </div>
            )}

            {/* Estimated Fee */}
            {details.estimatedFee && (
              <div className="bg-warning/10 flex items-start gap-2 rounded-md p-3">
                <AlertCircle className="text-warning mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Estimated Fee
                  </p>
                  <p className="text-warning mt-0.5 text-sm font-medium">
                    ~{details.estimatedFee} XLM
                  </p>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="bg-destructive/10 flex items-start gap-2 rounded-md p-3">
              <AlertCircle className="text-destructive mt-0.5 h-4 w-4" />
              <p className="text-destructive text-xs font-medium">
                This action is irreversible. Please verify all details before confirming.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isPending}
                className="shimmer-on-hover flex-1"
                ref={confirmButtonRef}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {`Opening Freighter to ${actionLabel}...`}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    {`Confirm to ${actionLabel}`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>,
    document.body
  )
}
