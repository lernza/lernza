import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface Notice {
  id: number
  title: string
  category: string
  date: string
  image: string
  author: {
    name: string
    role: string
  }
}

const notices: Notice[] = [
  {
    id: 1,
    title: "Math Olympiad Competition",
    category: "Competition",
    date: "04/15/2030",
    image: "/placeholder.svg?height=60&width=60",
    author: {
      name: "Ms. Jackson",
      role: "Math Teacher",
    },
  },
  {
    id: 2,
    title: "Yearbook Photo Submissions Wanted",
    category: "Announcement",
    date: "04/15/2030",
    image: "/placeholder.svg?height=60&width=60",
    author: {
      name: "Yearbook Committee",
      role: "",
    },
  },
  {
    id: 3,
    title: "Reminder: School Play Auditions This Week",
    category: "Event",
    date: "04/12/2030",
    image: "/placeholder.svg?height=60&width=60",
    author: {
      name: "Mr. Rodriguez",
      role: "Drama Teacher",
    },
  },
  {
    id: 4,
    title: "Lost and Found Overflowing!",
    category: "Announcement",
    date: "04/10/2030",
    image: "/placeholder.svg?height=60&width=60",
    author: {
      name: "School Administration",
      role: "",
    },
  },
  {
    id: 5,
    title: "Important Update: School Uniform Policy",
    category: "Policy",
    date: "04/09/2030",
    image: "/placeholder.svg?height=60&width=60",
    author: {
      name: "Principal Smith",
      role: "",
    },
  },
]

export function NoticeBoard() {
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Notice Board</h2>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M12 19L5 12L12 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="sr-only">Previous</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M12 5L19 12L12 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        {notices.slice(0, 3).map((notice) => (
          <Card key={notice.id} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                  <Image src={notice.image || "/placeholder.svg"} alt={notice.title} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{notice.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{notice.category}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      By {notice.author.name}
                      {notice.author.role && <span> ({notice.author.role})</span>}
                    </div>
                    <div className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-500">{notice.date}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

