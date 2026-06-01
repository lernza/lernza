import { Upload, X } from "lucide-react"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTokens } from "@/lib/utils"
import { useScrollLock } from "@/hooks/use-scroll-lock"

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
  data: ImportedQuest | null
}

export function ImportQuestDialog({ isOpen, onClose, onConfirm, data }: ImportQuestDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll when dialog is open
  useScrollLock(isOpen)

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the primary action button after a brief delay
      const focusTimer = setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus()
        }
      }, 100)

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose()
          return
        }

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
        // Restore focus to the previously focused element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [isOpen, onClose])

  if (!isOpen || !data) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        className="animate-fade-in-up relative z-10 w-full max-w-md px-4"
      >
        <Card className="border-border overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
          <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <span
                id="import-dialog-title"
                className="text-sm font-black tracking-wider uppercase"
              >
                Import Quest
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border-2 shadow-sm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Quest Name
              </p>
              <p className="mt-1 text-lg font-black">{data.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Description
              </p>
              <p className="mt-1 text-sm">{data.description}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Milestones
              </p>
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
                          {formatTokens(ms.rewardAmount)} USDC
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                className="shimmer-on-hover flex-1"
                ref={confirmButtonRef}
              >
                <Upload className="h-4 w-4" />
                Import & Create
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
