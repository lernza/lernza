import { useState } from "react"
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  MailCheck,
} from "lucide-react"
import { useNotifications, type NotificationToast } from "@/contexts/notification-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface NotificationsPageProps {
  onBack?: () => void
}

function formatFullTime(timestamp?: number): string {
  if (!timestamp) return ""
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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

export function NotificationsPage({ onBack }: NotificationsPageProps) {
  const { history, unreadCount, markAsRead, markAllAsRead, clearHistory } = useNotifications()
  const [filter, setFilter] = useState<"all" | "unread" | "quest" | "system">("all")

  const filteredHistory = history.filter((item: NotificationToast) => {
    if (filter === "unread") return !item.read
    if (filter === "quest") {
      return (
        item.category === "enrollment" ||
        item.category === "submission" ||
        item.category === "verification" ||
        item.category === "quest_status" ||
        item.category === "milestone"
      )
    }
    if (filter === "system") {
      return item.category === "system" || item.category === "reward" || item.category === "reward_distribution"
    }
    return true
  })

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
        >
          <div className="border-border bg-background flex h-7 w-7 items-center justify-center border shadow-sm transition-colors group-hover:bg-secondary">
            <ArrowLeft className="h-3.5 w-3.5" />
          </div>
          Back to Dashboard
        </button>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-accent" />
            Notification Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View and manage your on-chain quest activity, verifications, and system alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            filter === "all"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({history.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filter === "unread"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter("quest")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            filter === "quest"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Quests & Milestones
        </button>
        <button
          type="button"
          onClick={() => setFilter("system")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            filter === "system"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          System & Rewards
        </button>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground">
                <MailCheck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground">No notifications found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">
                {filter === "unread"
                  ? "You have read all of your notifications. Great job!"
                  : "Notifications about your quest activity and milestones will show up here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((item: NotificationToast) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-4 rounded-lg border border-border p-4 transition-colors ${
                !item.read ? "bg-accent/5 border-accent/40" : "bg-card"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-1">{getNotificationIcon(item.type)}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm text-foreground">
                      {item.title || "Notification"}
                    </h4>
                    {item.category && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {item.category.replace("_", " ")}
                      </span>
                    )}
                    {!item.read && (
                      <span className="rounded-full bg-accent px-1.5 py-0.2 text-[9px] font-bold text-accent-foreground">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {item.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground/75 mt-1.5">
                    {formatFullTime(item.createdAt)}
                  </p>
                </div>
              </div>

              {!item.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(item.id)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  Mark read
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
export default NotificationsPage
