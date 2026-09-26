import { useState, useRef, useEffect } from "react"
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react"
import { useNotifications, type NotificationToast } from "@/contexts/notification-context"

interface NotificationCenterProps {
  onNavigate?: (page: string) => void
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return ""
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 60) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d ago`
}

function getNotificationIcon(type?: string) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
    default:
      return <Info className="h-4 w-4 text-primary shrink-0" />
  }
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { history, unreadCount, markAsRead, markAllAsRead, clearHistory } = useNotifications()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const recent = history.slice(0, 8)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id="notification-bell-btn"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded border border-border bg-background hover:bg-secondary text-foreground transition-colors cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow-sm"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notification Center"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-border bg-background shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  title="Clear history"
                  className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2 text-muted-foreground">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You're all caught up with your quest activity.
                </p>
              </div>
            ) : (
              recent.map((item: NotificationToast) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) markAsRead(item.id)
                  }}
                  className={`flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-secondary/40 ${
                    !item.read ? "bg-accent/5 font-medium" : "opacity-85"
                  }`}
                >
                  <div className="mt-0.5">{getNotificationIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.title || "Notification"}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                  {!item.read && (
                    <span
                      aria-label="Unread"
                      className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-secondary/30 p-2 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                if (onNavigate) {
                  onNavigate("notifications")
                } else if (typeof window !== "undefined") {
                  window.location.href = "/notifications"
                }
              }}
              className="w-full py-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-1"
            >
              <span>View full notification history</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
