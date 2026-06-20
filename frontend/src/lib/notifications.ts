import type { Toast } from "@/hooks/use-toast"

export type ToastInput = Omit<Toast, "id">

type ToastListener = (toast: ToastInput) => void

const listeners = new Set<ToastListener>()

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function pushToast(toast: ToastInput): void {
  listeners.forEach(listener => listener(toast))
}
