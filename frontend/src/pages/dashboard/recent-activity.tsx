import { Clock, Plus, Target, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type ActivityAction = "enrolled" | "completed" | "created"

interface ActivityEvent {
  id: string
  user: string
  action: ActivityAction
  questName: string
  timestamp: number
}

interface RecentActivityProps {
  activities: ActivityEvent[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
        <Clock className="h-5 w-5" /> Recent Activity
      </h2>
      <Card className="border-border border-[3px] shadow-[4px_4px_0_var(--color-border)]">
        <CardContent className="p-0">
          <div className="divide-border divide-y-[2px]">
            {activities.map(activity => {
              const isEnrolled = activity.action === "enrolled"
              const isCompleted = activity.action === "completed"
              const Icon = isEnrolled ? Plus : isCompleted ? Target : Sparkles
              const iconColor = isEnrolled
                ? "bg-primary"
                : isCompleted
                  ? "bg-success"
                  : "bg-background"

              return (
                <div
                  key={activity.id}
                  className="hover:bg-secondary flex gap-3 p-4 transition-colors"
                >
                  <div
                    className={`h-8 w-8 ${iconColor} border-border mt-1 flex flex-shrink-0 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)]`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-bold">{activity.user}</span>{" "}
                      {isEnrolled
                        ? "enrolled in"
                        : isCompleted
                          ? "completed a milestone in"
                          : "created"}{" "}
                      <span className="font-bold">{activity.questName}</span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs font-bold">
                      {new Date(activity.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
