import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Activity {
  id: number
  title: string
  description: string
  time: string
  icon: string
  iconBg: string
}

const activities: Activity[] = [
  {
    id: 1,
    title: "Regional Robotics Champion",
    description: "Winning robots triumph in engineering challenge",
    time: "2 days ago",
    icon: "🤖",
    iconBg: "bg-blue-100",
  },
  {
    id: 2,
    title: "Won Regional Debate Competition",
    description: "Debate team's compelling arguments reach national stage",
    time: "10 hours ago",
    icon: "🏆",
    iconBg: "bg-purple-100",
  },
  {
    id: 3,
    title: "2nd Place at Science State Fair",
    description: "Science Club earns state-level showcase",
    time: "3 weeks ago",
    icon: "🔬",
    iconBg: "bg-yellow-100",
  },
]

export function StudentActivity() {
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Student Activity</h2>
        <Button variant="ghost" className="text-sm text-blue-500">
          View All
        </Button>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => (
          <Card key={activity.id} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${activity.iconBg}`}>
                  <span className="text-lg">{activity.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{activity.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
                  <p className="mt-1 text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

