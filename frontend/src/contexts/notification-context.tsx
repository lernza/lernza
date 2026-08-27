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
export type NotificationCategory =
  | "enrollment"
  | "submission"
  | "verification"
  | "reward_distribution"
  | "deadline_reminder"
  | "quest_cancellation"
  | "quest_status"
  | "milestone"
  | "reward"
  | "system"

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
  // Delivery Channels
  toastEnabled: boolean
  emailAlertsEnabled: boolean
  inAppAlertsEnabled: boolean
  soundEnabled: boolean

  // Quest Activity Preferences (Issue #1461)
  enrollmentAlerts: boolean
  submissionAlerts: boolean
  verificationAlerts: boolean
  rewardDistributionAlerts: boolean
  deadlineReminderAlerts: boolean
  questCancellationAlerts: boolean

  // General category flags (maintained for backwards compatibility)
  questStatusAlerts: boolean
  milestoneAlerts: boolean
  rewardAlerts: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  toastEnabled: true,
  emailAlertsEnabled: true,
  inAppAlertsEnabled: true,
  soundEnabled: false,

  enrollmentAlerts: true,
  submissionAlerts: true,
  verificationAlerts: true,
  rewardDistributionAlerts: true,
  deadlineReminderAlerts: true,
  questCancellationAlerts: true,

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
  notifyEnrollment: (questName: string, learnerAddress: string, action?: "enrolled" | "added" | "invited") => void
  notifySubmission: (questName: string, milestoneTitle: string, submitter?: string) => void
  notifyVerification: (milestoneTitle: string, status: "approved" | "rejected" | "changes_requested", feedback?: string) => void
  notifyRewardDistribution: (amount: string, actionType: "funded" | "claimed" | "refunded") => void
  notifyDeadlineReminder: (questName: string, timeRemaining: string) => void
  notifyQuestCancellation: (questName: string, reason?: string) => void
  notifyQuestStatusChange: (questName: string, status: "created" | "updated" | "archived" | "cancelled") => void
  notifyMilestoneCompletion: (milestoneTitle: string, status: "submitted" | "approved" | "rejected") => void
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
      // Category / Activity preference filters
      if (category === "enrollment" && !preferences.enrollmentAlerts) return ""
      if (category === "submission" && !preferences.submissionAlerts) return ""
      if (category === "verification" && !preferences.verificationAlerts) return ""
      if (category === "reward_distribution" && !preferences.rewardDistributionAlerts) return ""
      if (category === "deadline_reminder" && !preferences.deadlineReminderAlerts) return ""
      if (category === "quest_cancellation" && !preferences.questCancellationAlerts) return ""
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

  const notifyEnrollment = useCallback(
    (questName: string, learnerAddress: string, action: "enrolled" | "added" | "invited" = "enrolled") => {
      const shortAddr = `${learnerAddress.slice(0, 6)}...${learnerAddress.slice(-4)}`
      const msgMap = {
        enrolled: `Learner ${shortAddr} enrolled in "${questName}".`,
        added: `Learner ${shortAddr} was added to "${questName}".`,
        invited: `Invite accepted for "${questName}" by ${shortAddr}.`,
      }
      addToast({
        title: "New Quest Enrollment",
        message: msgMap[action],
        type: "info",
        category: "enrollment",
      })
    },
    [addToast]
  )

  const notifySubmission = useCallback(
    (questName: string, milestoneTitle: string, submitter?: string) => {
      const subText = submitter ? ` by ${submitter.slice(0, 6)}...${submitter.slice(-4)}` : ""
      addToast({
        title: "Milestone Submitted",
        message: `Submission for "${milestoneTitle}" in "${questName}"${subText} is ready for review.`,
        type: "info",
        category: "submission",
      })
    },
    [addToast]
  )

  const notifyVerification = useCallback(
    (milestoneTitle: string, status: "approved" | "rejected" | "changes_requested", feedback?: string) => {
      const typeMap: Record<typeof status, NotificationType> = {
        approved: "success",
        rejected: "error",
        changes_requested: "warning",
      }
      const titleMap: Record<typeof status, string> = {
        approved: "Milestone Verified!",
        rejected: "Submission Rejected",
        changes_requested: "Changes Requested",
      }
      const baseMsgMap: Record<typeof status, string> = {
        approved: `Milestone "${milestoneTitle}" has been verified and approved!`,
        rejected: `Milestone "${milestoneTitle}" was rejected.`,
        changes_requested: `Reviewer requested revisions for "${milestoneTitle}".`,
      }
      const message = feedback ? `${baseMsgMap[status]} Feedback: "${feedback}"` : baseMsgMap[status]

      addToast({
        title: titleMap[status],
        message,
        type: typeMap[status],
        category: "verification",
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
        claimed: "Reward Distributed!",
        refunded: "Unallocated Escrow Refunded",
      }
      const msgMap: Record<typeof actionType, string> = {
        funded: `Successfully funded ${amount} to quest reward escrow.`,
        claimed: `Reward payout of ${amount} distributed for milestone completion!`,
        refunded: `${amount} unallocated escrow refunded to quest creator.`,
      }

      addToast({
        title: titleMap[actionType],
        message: msgMap[actionType],
        type: typeMap[actionType],
        category: "reward_distribution",
      })
    },
    [addToast]
  )

  const notifyDeadlineReminder = useCallback(
    (questName: string, timeRemaining: string) => {
      addToast({
        title: "Deadline Approaching",
        message: `Quest "${questName}" deadline is approaching in ${timeRemaining}. Complete milestones to earn rewards!`,
        type: "warning",
        category: "deadline_reminder",
      })
    },
    [addToast]
  )

  const notifyQuestCancellation = useCallback(
    (questName: string, reason?: string) => {
      addToast({
        title: "Quest Cancelled",
        message: `Quest "${questName}" has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
        type: "error",
        category: "quest_cancellation",
      })
    },
    [addToast]
  )

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
        category: status === "cancelled" ? "quest_cancellation" : "quest_status",
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
        category: status === "submitted" ? "submission" : "verification",
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
        notifyEnrollment,
        notifySubmission,
        notifyVerification,
        notifyRewardDistribution,
        notifyDeadlineReminder,
        notifyQuestCancellation,
        notifyQuestStatusChange,
        notifyMilestoneCompletion,
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
