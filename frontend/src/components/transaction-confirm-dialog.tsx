import { useState, useCallback, useEffect, useRef } from "react"
import { X, Shield, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatTokens } from "@/lib/utils"

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

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

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

  // Handle Focus Trap
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the first interactive element or the card itself
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements && focusableElements.length > 0) {
        ;(focusableElements[0] as HTMLElement).focus()
      }

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
        window.removeEventListener("keydown", handleTabKey)
        previousFocusRef.current?.focus()
      }
    }
  }, [isOpen])

  if (!isOpen || !details) return null

  return (
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
        <Card className="border-border overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
          {/* Header */}
          <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" aria-hidden="true" />
              <span id="tx-dialog-title" className="text-sm font-black tracking-wider uppercase">
                Confirm Transaction
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border-[2px] disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="mt-1 text-lg font-black">{details.actionName}</p>
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
              <div className="border-primary/20 bg-primary/5 rounded-md border-2 p-3">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Amount
                </p>
                <p className="text-primary mt-1 text-2xl font-black">
                  {formatTokens(Number(details.tokenAmount))} {details.tokenSymbol}
                </p>
              </div>
            )}

            {/* Estimated Fee */}
            {details.estimatedFee && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs font-bold tracking-wider text-amber-800 uppercase">
                    Estimated Fee
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-amber-700">
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
              <Button onClick={onConfirm} disabled={isPending} className="shimmer-on-hover flex-1">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening Freighter...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Confirm & Sign
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
