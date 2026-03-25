import { Clock, Plus, Target, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityEvent } from "@/lib/mock-data"

interface RecentActivityProps {
  activities: ActivityEvent[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div>
      <h2 className="text-xl font-black mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" /> Recent Activity
      </h2>
      <Card className="border-[3px] border-black shadow-[4px_4px_0_#000]">
        <CardContent className="p-0">
          <div className="divide-y-[2px] divide-black">
            {activities.map((activity) => {
              const isEnrolled = activity.action === "enrolled"
              const isCompleted = activity.action === "completed"
              const Icon = isEnrolled ? Plus : isCompleted ? Target : Sparkles
              const iconColor = isEnrolled ? "bg-primary" : isCompleted ? "bg-success" : "bg-white"

              return (
                <div key={activity.id} className="p-4 flex gap-3 hover:bg-secondary transition-colors">
                  <div className={`w-8 h-8 ${iconColor} border-[2px] border-black flex-shrink-0 flex items-center justify-center shadow-[2px_2px_0_#000] mt-1`}>
                     <Icon className="w-4 h-4" />
                  </div>
                  <div>
                     <p className="text-sm">
                       <span className="font-bold">{activity.user}</span>{" "}
                       {isEnrolled ? "enrolled in" : isCompleted ? "completed a milestone in" : "created"}{" "}
                       <span className="font-bold">{activity.workspaceName}</span>
                     </p>
                     <p className="text-xs text-muted-foreground font-bold mt-1">
                       {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
