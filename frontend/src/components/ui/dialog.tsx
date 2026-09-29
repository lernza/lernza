import * as React from "react"
import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { useFocusTrap } from "@/hooks/use-focus-trap"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DialogTitleContext = React.createContext<string | undefined>(undefined)

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleId = React.useId()

  const handleEscape = useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  useFocusTrap(containerRef, { isActive: !!open, onEscape: handleEscape })

  if (!open) return null
  return (
    <DialogTitleContext.Provider value={titleId}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Fallback so the container can take focus when it holds no focusable
        // children, and so the trap never strands focus on <body>.
        tabIndex={-1}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 focus:outline-none"
      >
        {children}
      </div>
    </DialogTitleContext.Provider>
  )
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-border bg-card relative w-full max-w-lg rounded-xl border p-6 shadow-xl",
        className
      )}
    >
      {children}
    </div>
  )
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("mb-4 flex flex-col space-y-1.5", className)}>{children}</div>
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const titleId = React.useContext(DialogTitleContext)
  return (
    <h2 id={titleId} className={cn("text-foreground text-lg font-bold tracking-tight", className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
    >
      {children}
    </div>
  )
}
