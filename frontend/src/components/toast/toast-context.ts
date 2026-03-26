import { createContext } from "react"
import type { Toast } from "./ToastTypes"

export interface ToastContextValue {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
