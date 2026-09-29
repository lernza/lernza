import { CheckCircle2, Coins, FileSpreadsheet, X } from "lucide-react"
import { useEffect, useRef } from "react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { formatUsdc } from "@/lib/utils"
import type { ParsedMilestone } from "@/pages/create-quest/csv-parser"
import { useTokenSymbol } from "@/hooks/use-token-symbol"

export interface ImportedQuest {
  name: string
  description: string
  milestones: {
    title: string
    description: string
    rewardAmount: number
    requiresPrevious: boolean
  }[]
}

interface ImportQuestDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  milestones: ParsedMilestone[]
  mode: "append" | "replace"
  existingCount: number
  questName: string
}

export function ImportQuestDialog({
  isOpen,
  onClose,
  onConfirm,
  milestones,
  mode,
  existingCount,
  questName,
}: ImportQuestDialogProps) {
export function ImportQuestDialog({ isOpen, onClose, onConfirm, data }: ImportQuestDialogProps) {
  const { symbol } = useTokenSymbol()
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useScrollLock(isOpen)

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement

      const focusTimer = setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus()
        }
      }, 100)
  const isRendered = isOpen && milestones.length > 0

  // Trap focus, autofocus the confirm button, close on Escape, restore focus.
  useFocusTrap(dialogRef, {
    isActive: isRendered,
    onEscape: onClose,
    initialFocusRef: confirmButtonRef,
  })

  if (!isRendered) return null

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement

      const focusTimer = setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus()
        }
      }, 100)
  const isRendered = isOpen && milestones.length > 0

  // Trap focus, autofocus the confirm button, close on Escape, restore focus.
  useFocusTrap(dialogRef, {
    isActive: isRendered,
    onEscape: onClose,
    initialFocusRef: confirmButtonRef,
  })

  if (!isRendered) return null

        if (e.key === "Tab" && dialogRef.current) {
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
      }

      window.addEventListener("keydown", handleKeyDown)

      return () => {
        clearTimeout(focusTimer)
        window.removeEventListener("keydown", handleKeyDown)
        if (previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [isOpen, onClose])

  if (!isOpen || milestones.length === 0) return null

  const totalReward = milestones.reduce((sum, m) => sum + m.rewardAmount, 0)
  const resultingCount = mode === "replace" ? milestones.length : existingCount + milestones.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        tabIndex={-1}
        className="animate-fade-in-up relative z-10 w-full max-w-md px-4"
      >
        <Card className="border-border overflow-hidden border shadow-xl">
          <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              <span
                id="import-dialog-title"
                className="text-sm font-semibold tracking-wider uppercase"
              >
                Review Imported Milestones
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close import review"
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border-2 shadow-sm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Target Quest
              </p>
              <p className="mt-1 truncate text-lg font-semibold">
                {questName.trim() || "Untitled quest"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {mode === "replace"
                  ? `Replaces the ${existingCount} milestone${existingCount === 1 ? "" : "s"} already added.`
                  : `Appends to the ${existingCount} milestone${existingCount === 1 ? "" : "s"} already added.`}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Milestones ({milestones.length})
              </p>
              <Badge variant="outline" className="text-[10px]">
                {resultingCount} total on quest
              </Badge>
            </div>

            <div className="max-h-[30vh] space-y-2 overflow-y-auto pr-1">
              {milestones.map((ms, i) => (
                <div key={i} className="bg-muted/50 border-border border p-2 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        <span className="text-muted-foreground mr-1.5 tabular-nums">{i + 1}.</span>
                        {ms.title}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 text-xs">{ms.description}</p>
              <div className="mt-1 max-h-[30vh] space-y-2 overflow-y-auto pr-1">
                {data.milestones.map((ms, i) => (
                  <div key={i} className="bg-muted/50 border-border border p-2 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{ms.title}</p>
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {ms.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {ms.requiresPrevious && i > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            Sequential
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] tabular-nums">
                          {formatTokens(ms.rewardAmount, 7, symbol)}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] tabular-nums">
                      {formatUsdc(ms.rewardAmount)} USDC
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-secondary border-border flex items-center justify-between border px-3 py-2">
              <span className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <Coins className="h-3.5 w-3.5" />
                Imported total
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {formatUsdc(totalReward)} USDC
              </span>
            </div>

            <p className="text-muted-foreground text-xs">
              Confirming fills step 2 with these milestones. You can still reorder, edit, or remove
              them before the quest is created on-chain.
            </p>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                className="shimmer-on-hover flex-1"
                ref={confirmButtonRef}
              >
                <CheckCircle2 className="h-4 w-4" />
                Add These Milestones
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
