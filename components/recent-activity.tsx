import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Activity {
  id: number
  user: {
    name: string
    avatar: string
  }
  action: string
  subject: string
  category: string
  time: string
  status?: string
  statusColor?: string
  count?: number
}

const activities: Activity[] = [
  {
    id: 1,
    user: {
      name: "Ms. Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    action: "assigned new",
    subject: "English Literature",
    category: "homework",
    time: "20 minutes ago",
    count: 325,
  },
  {
    id: 2,
    user: {
      name: "David Lee",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    action: "already submitted quiz in",
    subject: "History",
    category: "",
    time: "1 hour ago",
    count: 587,
  },
  {
    id: 3,
    user: {
      name: "Permission Slip Reminder:",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    action: "",
    subject: "Science Museum Field Trip",
    category: "",
    time: "3 hours ago",
    count: 492,
  },
  {
    id: 4,
    user: {
      name: "Permission Slip Reminder:",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    action: "",
    subject: "Science Museum Field Trip",
    category: "",
    time: "5 hours ago",
    count: 192,
  },
]

export function RecentActivity() {
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Recent Activity</h2>
        <Button variant="ghost" className="text-sm text-blue-500">
          View All
        </Button>
      </div>
      <div className="mb-4">
        <h3 className="text-sm font-medium">Today</h3>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => (
          <Card key={activity.id} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.user.avatar} />
                  <AvatarFallback>
                    {activity.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-medium">{activity.user.name}</span>
                    {activity.action && <span className="text-gray-600">{activity.action}</span>}
                    <span className="font-medium">{activity.subject}</span>
                    {activity.category && <span className="text-gray-600">{activity.category}</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{activity.time}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {activity.count && (
                    <div className="flex h-6 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-medium">
                      {activity.count}
                    </div>
                  )}
                  <Button variant="outline" className="h-8 rounded-full border-gray-200 px-4 text-xs">
                    Review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

