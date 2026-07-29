import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications, type NotificationToast } from "@/contexts/notification-context"

interface ToastItemProps {
  toast: NotificationToast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 10)
    const duration = toast.duration ?? 4000
    const leaveTimer = setTimeout(
      () => {
        setLeaving(true)
      },
      Math.max(100, duration - 350)
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
    success: <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success-foreground" />,
    error: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
    info: <Info className="h-4 w-4 flex-shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />,
  }

  const accents = {
    success: "bg-success border-border text-foreground",
    error: "bg-destructive text-destructive-foreground border-border",
    info: "bg-accent border-border text-foreground",
    warning: "bg-amber-500/15 border-amber-500/30 text-foreground",
  }

  const type = toast.type ?? "success"

  return (
    <div
      className={cn(
        "border-border flex w-full items-start gap-3 border p-4 shadow-lg sm:w-auto sm:max-w-md sm:min-w-[280px]",
        "transition-all duration-300 ease-out",
        accents[type],
        visible && !leaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="mt-0.5">{icons[type]}</div>
      <div className="flex-1 space-y-1">
        {toast.title && <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>}
        <p className="text-xs leading-normal font-medium">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick()
              handleRemove()
            }}
            className="border-border bg-background hover:bg-secondary mt-2 border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleRemove}
        className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-70"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts?: NotificationToast[]
  onRemove?: (id: string) => void
}

export function ToastContainer({ toasts: explicitToasts, onRemove: explicitOnRemove }: ToastContainerProps) {
  const context = useNotifications()
  const activeToasts = explicitToasts ?? context.toasts
  const removeFn = explicitOnRemove ?? context.removeToast

  if (!activeToasts || activeToasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-6 z-[100] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:right-6 sm:items-end"
      aria-label="Notifications"
    >
      {activeToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto w-full sm:w-auto">
          <ToastItem toast={toast} onRemove={removeFn} />
        </div>
      ))}
    </div>
  )
}
