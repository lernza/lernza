"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const currentDates = [19, 20, 21, 22, 23, 24, 25]

export function Calendar() {
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">September 2030</h2>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="sr-only">Previous month</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRightIcon className="h-4 w-4" />
            <span className="sr-only">Next month</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div key={day} className="flex h-8 items-center justify-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
        {currentDates.map((date, index) => (
          <Button
            key={date}
            variant="ghost"
            className={`h-12 rounded-lg ${date === 22 ? "bg-lightBlue font-bold" : ""}`}
          >
            {date}
          </Button>
        ))}
      </div>
      <div className="mt-6">
        <h3 className="mb-4 text-lg font-bold">Agenda</h3>
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-start space-x-3">
                <div className="text-sm font-medium">08:00 am</div>
                <div>
                  <div className="text-sm font-medium">All Grade</div>
                  <div className="text-sm text-gray-500">Homeroom & Announcement</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-start space-x-3">
                <div className="text-sm font-medium">10:00 am</div>
                <div>
                  <div className="text-sm font-medium">Grade 3-5</div>
                  <div className="text-sm text-gray-500">Math Review & Practice</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-start space-x-3">
                <div className="text-sm font-medium">10:30 am</div>
                <div>
                  <div className="text-sm font-medium">Grade 6-8</div>
                  <div className="text-sm text-gray-500">Science Experiment & Discussion</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

