import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react"

export type NotificationType = "success" | "error" | "info" | "warning"
export type NotificationCategory = "quest_status" | "milestone" | "reward" | "system"

export interface NotificationToast {
  id: string
  title?: string
  message: string
  type?: NotificationType
  category?: NotificationCategory
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  createdAt?: number
}

export interface NotificationPreferences {
  toastEnabled: boolean
  emailAlertsEnabled: boolean
  questStatusAlerts: boolean
  milestoneAlerts: boolean
  rewardAlerts: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  toastEnabled: true,
  emailAlertsEnabled: true,
  questStatusAlerts: true,
  milestoneAlerts: true,
  rewardAlerts: true,
}

const PREFS_STORAGE_KEY = "lernza_notification_preferences"

interface NotificationContextType {
  toasts: NotificationToast[]
  history: NotificationToast[]
  preferences: NotificationPreferences
  addToast: (toast: Omit<NotificationToast, "id" | "createdAt"> | string) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void
  updatePreferences: (newPrefs: Partial<NotificationPreferences>) => void
  notifyQuestStatusChange: (questName: string, status: "created" | "updated" | "archived" | "cancelled") => void
  notifyMilestoneCompletion: (milestoneTitle: string, status: "submitted" | "approved" | "rejected") => void
  notifyRewardDistribution: (amount: string, actionType: "funded" | "claimed" | "refunded") => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<NotificationToast[]>([])
  const [history, setHistory] = useState<NotificationToast[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY)
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES
    } catch {
      return DEFAULT_PREFERENCES
    }
  })

  const counterRef = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Ignore storage errors
    }
  }, [preferences])

  const updatePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }))
  }, [])

  const addToast = useCallback(
    (input: Omit<NotificationToast, "id" | "createdAt"> | string): string => {
      if (!preferences.toastEnabled) return ""

      const payload: Omit<NotificationToast, "id" | "createdAt"> =
        typeof input === "string" ? { message: input } : input

      const category = payload.category ?? "system"
      if (category === "quest_status" && !preferences.questStatusAlerts) return ""
      if (category === "milestone" && !preferences.milestoneAlerts) return ""
      if (category === "reward" && !preferences.rewardAlerts) return ""

      const id = `toast-${Date.now()}-${++counterRef.current}`
      const newToast: NotificationToast = {
        id,
        type: "success",
        duration: 4000,
        ...payload,
        createdAt: Date.now(),
      }

      setToasts(prev => [...prev, newToast])
      setHistory(prev => [newToast, ...prev].slice(0, 50)) // Keep last 50

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id))
        }, newToast.duration)
      }

      return id
    },
    [preferences]
  )

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const notifyQuestStatusChange = useCallback(
    (questName: string, status: "created" | "updated" | "archived" | "cancelled") => {
      const typeMap: Record<typeof status, NotificationType> = {
        created: "success",
        updated: "info",
        archived: "warning",
        cancelled: "error",
      }
      const titleMap: Record<typeof status, string> = {
        created: "Quest Live!",
        updated: "Quest Updated",
        archived: "Quest Archived",
        cancelled: "Quest Cancelled",
      }
      const msgMap: Record<typeof status, string> = {
        created: `Quest "${questName}" is now active on Stellar.`,
        updated: `Quest "${questName}" details were updated.`,
        archived: `Quest "${questName}" has been archived.`,
        cancelled: `Quest "${questName}" has been cancelled.`,
      }

      addToast({
        title: titleMap[status],
        message: msgMap[status],
        type: typeMap[status],
        category: "quest_status",
      })
    },
    [addToast]
  )

  const notifyMilestoneCompletion = useCallback(
    (milestoneTitle: string, status: "submitted" | "approved" | "rejected") => {
      const typeMap: Record<typeof status, NotificationType> = {
        submitted: "info",
        approved: "success",
        rejected: "error",
      }
      const titleMap: Record<typeof status, string> = {
        submitted: "Milestone Submitted",
        approved: "Milestone Approved!",
        rejected: "Submission Needs Revision",
      }
      const msgMap: Record<typeof status, string> = {
        submitted: `Submission for "${milestoneTitle}" sent for review.`,
        approved: `Milestone "${milestoneTitle}" has been verified!`,
        rejected: `Milestone "${milestoneTitle}" requires changes before approval.`,
      }

      addToast({
        title: titleMap[status],
        message: msgMap[status],
        type: typeMap[status],
        category: "milestone",
      })
    },
    [addToast]
  )

  const notifyRewardDistribution = useCallback(
    (amount: string, actionType: "funded" | "claimed" | "refunded") => {
      const typeMap: Record<typeof actionType, NotificationType> = {
        funded: "success",
        claimed: "success",
        refunded: "info",
      }
      const titleMap: Record<typeof actionType, string> = {
        funded: "Escrow Funded",
        claimed: "Reward Claimed!",
        refunded: "Unallocated Escrow Refunded",
      }
      const msgMap: Record<typeof actionType, string> = {
        funded: `Successfully funded ${amount} to quest reward escrow.`,
        claimed: `You claimed ${amount} for completing the milestone!`,
        refunded: `${amount} refunded to quest owner.`,
      }

      addToast({
        title: titleMap[actionType],
        message: msgMap[actionType],
        type: typeMap[actionType],
        category: "reward",
      })
    },
    [addToast]
  )

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        history,
        preferences,
        addToast,
        removeToast,
        clearAllToasts,
        updatePreferences,
        notifyQuestStatusChange,
        notifyMilestoneCompletion,
        notifyRewardDistribution,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
