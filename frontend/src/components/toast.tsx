import { useEffect, useRef, useState } from "react"
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Toast } from "@/hooks/use-toast"

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Mount: trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10)

    // Exit: start leave animation before removal
    const leaveTimer = setTimeout(
      () => {
        setLeaving(true)
      },
      (toast.duration ?? 3000) - 350
    )

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(leaveTimer)
    }
  }, [toast.duration])

  const handleRemove = () => {
    setLeaving(true)
    setTimeout(() => onRemove(toast.id), 340)
  }

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />,
    error: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
    info: <Info className="h-4 w-4 flex-shrink-0" />,
  }

  const accents = {
    success: "bg-success border-border",
    error: "bg-destructive text-destructive-foreground border-border",
    warning: "bg-warning text-warning-foreground border-border",
    info: "bg-primary border-border",
  }

  const type = toast.type ?? "success"

  return (
    <div
      className={cn(
        "flex max-w-sm min-w-[260px] items-center gap-3 border-[3px] px-4 py-3 shadow-[4px_4px_0_var(--color-border)]",
        "transition-all duration-300 ease-out",
        accents[type],
        visible && !leaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      {icons[type]}
      <div className="flex-1 text-sm leading-snug font-bold">{toast.message}</div>
      <button
        onClick={handleRemove}
        className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-70"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const politeRef = useRef<HTMLDivElement>(null)
  const assertiveRef = useRef<HTMLDivElement>(null)
  const announcedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const latest = toasts[toasts.length - 1]
    if (!latest) return
    if (announcedRef.current.has(latest.id)) return
    announcedRef.current.add(latest.id)

    const target = latest.type === "error" ? assertiveRef.current : politeRef.current
    if (!target) return

    // Clear first so ATs re-announce even when the message text is identical
    target.textContent = ""
    requestAnimationFrame(() => {
      if (typeof latest.message === "string") {
        target.textContent = latest.message
      } else {
        // Fallback for JSX elements to ensure screen readers get something
        target.textContent = "Notification"
      }
    })
  }, [toasts])

  return (
    <>
      {/* Persistent visually-hidden live regions — must exist before any toast fires */}
      <div ref={politeRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <div ref={assertiveRef} aria-live="assertive" aria-atomic="true" className="sr-only" />
      {toasts.length > 0 && (
        <div
          className="pointer-events-none fixed right-6 bottom-6 z-[100] flex flex-col items-end gap-3"
          aria-label="Notifications"
        >
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onRemove={onRemove} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
