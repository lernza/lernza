"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useRef } from "react"
import { Chart, registerables } from "chart.js"

Chart.register(...registerables)

export function AttendanceChart() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d")

      if (ctx) {
        // Destroy previous chart instance if it exists
        if (chartInstance.current) {
          chartInstance.current.destroy()
        }

        // Create new chart
        chartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            datasets: [
              {
                label: "Present",
                data: [75, 85, 95, 80, 70],
                backgroundColor: "#FFD43B",
                borderRadius: 4,
                barPercentage: 0.5,
                categoryPercentage: 0.7,
              },
              {
                label: "Absent",
                data: [50, 60, 40, 65, 55],
                backgroundColor: "#74C0FC",
                borderRadius: 4,
                barPercentage: 0.5,
                categoryPercentage: 0.7,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: {
                  display: false,
                },
              },
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  stepSize: 25,
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
            },
          },
        })
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [])

  return (
    <Card className="border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Attendance</CardTitle>
        <div className="flex space-x-2">
          <Select defaultValue="weekly">
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue placeholder="Weekly" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="grade3">
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue placeholder="Grade 3" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grade3">Grade 3</SelectItem>
              <SelectItem value="grade4">Grade 4</SelectItem>
              <SelectItem value="grade5">Grade 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[240px] w-full">
          <canvas ref={chartRef} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-center">
            <div className="text-xl font-bold">95%</div>
          </div>
        </div>
        <div className="mt-4 flex justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-[#FFD43B]"></div>
            <div className="text-sm text-gray-500">Total Present</div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-[#74C0FC]"></div>
            <div className="text-sm text-gray-500">Total Absent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

