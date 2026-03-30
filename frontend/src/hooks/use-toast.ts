import { useState, useCallback, useEffect, useRef, type ReactNode } from "react"

export interface Toast {
  id: string
  message: ReactNode
  type?: "success" | "error" | "info" | "warning"
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
      timersRef.current.clear()
    },
    []
  )

  const addToast = useCallback(
    (message: ReactNode, type: Toast["type"] = "success", duration = 3000) => {
      const id = `toast-${++counterRef.current}`
      setToasts(prev => [...prev, { id, message, type, duration }])
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        timersRef.current.delete(id)
      }, duration)
      timersRef.current.set(id, timer)
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
