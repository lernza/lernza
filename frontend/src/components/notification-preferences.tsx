import {
  Bell,
  Mail,
  UserPlus,
  FileCheck2,
  CheckCircle2,
  Coins,
  ClockAlert,
  Ban,
  Smartphone,
} from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import { cn } from "@/lib/utils"

export function NotificationPreferencesCard() {
  const { preferences, updatePreferences } = useNotifications()

  return (
    <div className="border-border bg-background border shadow-md">
      <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-semibold tracking-wider uppercase">
            Notification Settings
          </span>
        </div>
        <span className="text-muted-foreground text-xs font-semibold">Quest Activity & Delivery</span>
      </div>

      <div className="divide-border divide-y p-6 space-y-6">
        {/* Delivery Channels */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Delivery Channels
          </h4>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-accent border-border mt-0.5 flex h-8 w-8 items-center justify-center border">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Toast Notifications</p>
                <p className="text-muted-foreground text-xs">
                  Display real-time popup toasts on-screen during active session.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Toggle toast notifications"
              aria-checked={preferences.toastEnabled}
              onClick={() => updatePreferences({ toastEnabled: !preferences.toastEnabled })}
              className={cn(
                "border-border relative inline-flex h-6 w-11 cursor-pointer items-center border transition-colors focus:outline-none",
                preferences.toastEnabled ? "bg-accent" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform bg-foreground transition-transform",
                  preferences.toastEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-accent border-border mt-0.5 flex h-8 w-8 items-center justify-center border">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Email Alerts</p>
                <p className="text-muted-foreground text-xs">
                  Receive email digests for quest updates, milestone approvals, and reward payouts.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Toggle email alerts"
              aria-checked={preferences.emailAlertsEnabled}
              onClick={() =>
                updatePreferences({ emailAlertsEnabled: !preferences.emailAlertsEnabled })
              }
              className={cn(
                "border-border relative inline-flex h-6 w-11 cursor-pointer items-center border transition-colors focus:outline-none",
                preferences.emailAlertsEnabled ? "bg-accent" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform bg-foreground transition-transform",
                  preferences.emailAlertsEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-accent border-border mt-0.5 flex h-8 w-8 items-center justify-center border">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">In-App Notification Feed</p>
                <p className="text-muted-foreground text-xs">
                  Record alerts in your in-app notification history bell.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Toggle in-app notification feed"
              aria-checked={preferences.inAppAlertsEnabled}
              onClick={() =>
                updatePreferences({ inAppAlertsEnabled: !preferences.inAppAlertsEnabled })
              }
              className={cn(
                "border-border relative inline-flex h-6 w-11 cursor-pointer items-center border transition-colors focus:outline-none",
                preferences.inAppAlertsEnabled ? "bg-accent" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform bg-foreground transition-transform",
                  preferences.inAppAlertsEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {/* Quest Activity Preferences (Issue #1461) */}
        <div className="space-y-4 pt-6">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Quest Activity Alerts
          </h4>

          {/* 1. Enrollment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Enrollment Activity</p>
                <p className="text-muted-foreground text-xs">
                  Alerts when learners enroll, accept invitations, or join your quests.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Enrollment Activity"
              checked={preferences.enrollmentAlerts}
              onChange={e => updatePreferences({ enrollmentAlerts: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>

          {/* 2. Submission */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Milestone Submissions</p>
                <p className="text-muted-foreground text-xs">
                  Alerts when proof submissions are entered for peer or creator review.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Milestone Submissions"
              checked={preferences.submissionAlerts}
              onChange={e => updatePreferences({ submissionAlerts: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>

          {/* 3. Verification */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Verification & Review Feedback</p>
                <p className="text-muted-foreground text-xs">
                  Alerts when milestone proofs are approved, rejected, or revised with feedback.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Verification & Review Feedback"
              checked={preferences.verificationAlerts}
              onChange={e =>
                updatePreferences({
                  verificationAlerts: e.target.checked,
                  milestoneAlerts: e.target.checked,
                })
              }
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>

          {/* 4. Reward Distribution */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Reward Distribution & Escrow</p>
                <p className="text-muted-foreground text-xs">
                  Alerts when reward escrow pools are funded, payouts claimed, or tokens refunded.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Reward Distribution & Escrow"
              checked={preferences.rewardDistributionAlerts}
              onChange={e =>
                updatePreferences({
                  rewardDistributionAlerts: e.target.checked,
                  rewardAlerts: e.target.checked,
                })
              }
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>

          {/* 5. Deadline Reminders */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClockAlert className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Deadline Reminders</p>
                <p className="text-muted-foreground text-xs">
                  Urgent alerts before quest expiration windows close.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Deadline Reminders"
              checked={preferences.deadlineReminderAlerts}
              onChange={e => updatePreferences({ deadlineReminderAlerts: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>

          {/* 6. Quest Cancellation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ban className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Quest Cancellation & Archival</p>
                <p className="text-muted-foreground text-xs">
                  Alerts if an enrolled quest is cancelled or prematurely archived.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Quest Cancellation & Archival"
              checked={preferences.questCancellationAlerts}
              onChange={e =>
                updatePreferences({
                  questCancellationAlerts: e.target.checked,
                  questStatusAlerts: e.target.checked,
                })
              }
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
