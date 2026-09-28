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

/**
 * Renders both toast stores.
 *
 * There are two of them: the notification context (`useNotifications`), which
 * owns preferences, categories and history, and the older `useToast` hook, which
 * is still called directly by a number of components. This component used to
 * resolve them as `explicitToasts ?? context.toasts`, which meant that any
 * caller passing the `useToast` list — as both `App.tsx` and `pages/quest.tsx`
 * did — permanently shadowed every notification raised through the context. The
 * notification preferences, the verification results from the event stream and
 * the deadline reminders all produced toasts that could not be seen, while the
 * caller looked correctly wired.
 *
 * Rendering the union means the two stores coexist. Dismissal is routed to
 * whichever store actually holds the id, so neither is left with a toast that
 * has already been closed on screen.
 */
export function ToastContainer({
  toasts: explicitToasts,
  onRemove: explicitOnRemove,
}: ToastContainerProps) {
  const context = useNotifications()

  // The legacy `useToast` store omits `title`/`category`; the shape is
  // structurally a subset of `NotificationToast`, so the two lists concatenate
  // without conversion.
  const legacyToasts = explicitToasts ?? []
  const contextToasts = context.toasts ?? []
  const legacyIds = new Set(legacyToasts.map(toast => toast.id))

  const merged: NotificationToast[] = [...contextToasts, ...legacyToasts]

  // Dismissal has to reach the store that actually holds the toast: calling
  // only one of them would leave the other with an entry that is already gone
  // from the screen. The stores mint ids from different schemes
  // (`toast-<ts>-<n>` vs `toast-<n>`), so an id identifies exactly one store.
  const remove = (id: string) => {
    if (legacyIds.has(id)) {
      explicitOnRemove?.(id)
      return
    }
    context.removeToast(id)
  }

  if (merged.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-6 z-[100] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:right-6 sm:items-end"
      aria-label="Notifications"
    >
      {merged.map(toast => (
        <div key={toast.id} className="pointer-events-auto w-full sm:w-auto">
          <ToastItem toast={toast} onRemove={remove} />
        </div>
      ))}
    </div>
  )
}
