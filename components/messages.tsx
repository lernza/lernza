import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Message {
  id: number
  name: string
  avatar: string
  time: string
  message: string
}

const messages: Message[] = [
  {
    id: 1,
    name: "Dr. Lila Ramirez",
    avatar: "/placeholder.svg?height=32&width=32",
    time: "9:00 AM",
    message: "Please ensure the monthly attendance report is accurate before the April 30th deadline.",
  },
  {
    id: 2,
    name: "Ms. Heather Morris",
    avatar: "/placeholder.svg?height=32&width=32",
    time: "10:15 AM",
    message: "Don't forget the staff training on digital tools scheduled for May 5th at 3 PM in the conference room.",
  },
  {
    id: 3,
    name: "Mr. Carl Jenkins",
    avatar: "/placeholder.svg?height=32&width=32",
    time: "2:00 PM",
    message: "Budget review meeting for the next fiscal year is on April 28th at 10 AM.",
  },
  {
    id: 4,
    name: "Officer Dan Brooks",
    avatar: "/placeholder.svg?height=32&width=32",
    time: "3:10 PM",
    message:
      "Review the updated security protocols effective May 1st. Familiarize yourself with the new emergency procedures.",
  },
  {
    id: 5,
    name: "Ms. Tina Goldberg",
    avatar: "/placeholder.svg?height=32&width=32",
    time: "5:00 PM",
    message: "Reminder: Music Theater system upgrade on May 8th from 1 PM to 4 PM.",
  },
]

export function Messages() {
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Messages</h2>
        <Button variant="ghost" className="text-sm text-blue-500">
          View All
        </Button>
      </div>
      <div className="space-y-3">
        {messages.map((message) => (
          <Card key={message.id} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={message.avatar} />
                  <AvatarFallback>
                    {message.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{message.name}</h3>
                    <span className="text-xs text-gray-500">{message.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{message.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

