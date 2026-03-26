import { useCallback, useState } from "react"
import type { ReactNode } from "react"
import { ToastContext } from "./toast-context"
import type { Toast } from "./ToastTypes"

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback(
    ({ duration = 4000, ...toast }: Omit<Toast, "id">) => {
      const id = crypto.randomUUID()

      setToasts(prev => [...prev, { ...toast, id, duration }])

      if (duration !== Infinity) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}
