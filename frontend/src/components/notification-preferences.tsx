import { Bell, Mail, ShieldAlert, CheckCircle2, Coins } from "lucide-react"
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
        <span className="text-muted-foreground text-xs font-semibold">Alert Preferences</span>
      </div>

      <div className="divide-border divide-y p-6 space-y-6">
        {/* Global Delivery Toggles */}
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
                  Display real-time popup toasts on-screen during activity.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
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
        </div>

        {/* Category Toggles */}
        <div className="space-y-4 pt-6">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Alert Topics
          </h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Quest Status Changes</p>
                <p className="text-muted-foreground text-xs">
                  Alerts when quests are created, updated, archived, or cancelled.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.questStatusAlerts}
              onChange={e => updatePreferences({ questStatusAlerts: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Milestone Completions</p>
                <p className="text-muted-foreground text-xs">
                  Alerts when milestones are submitted, approved, or rejected.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.milestoneAlerts}
              onChange={e => updatePreferences({ milestoneAlerts: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Reward & Escrow Distributions</p>
                <p className="text-muted-foreground text-xs">
                  Alerts when reward escrow pools are funded, claimed, or refunded.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.rewardAlerts}
              onChange={e => updatePreferences({ rewardAlerts: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
