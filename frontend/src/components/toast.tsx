import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"
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
    info: <Info className="h-4 w-4 flex-shrink-0" />,
  }

  const accents = {
    success: "bg-success border-border",
    error: "bg-destructive text-destructive-foreground border-border",
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
      role="alert"
      aria-live="polite"
    >
      {icons[type]}
      <p className="flex-1 text-sm leading-snug font-bold">{toast.message}</p>
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
  if (toasts.length === 0) return null

  return (
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
  )
}
