"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef } from "react"
import { Chart, registerables } from "chart.js"

Chart.register(...registerables)

export function StudentsChart() {
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
          type: "doughnut",
          data: {
            labels: ["Boys", "Girls"],
            datasets: [
              {
                data: [45414, 40270],
                backgroundColor: ["#74C0FC", "#FFD43B"],
                borderWidth: 0,
                cutout: "75%",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.label || ""
                    const value = context.raw as number
                    const total = (context.dataset.data as number[]).reduce((a, b) => (a as number) + (b as number), 0)
                    const percentage = Math.round(((value as number) / total) * 100)
                    return `${label}: ${value} (${percentage}%)`
                  },
                },
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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">Students</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[240px] w-full">
          <canvas ref={chartRef} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Total Students</div>
              <div className="text-xl font-bold">85,684</div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-[#74C0FC]"></div>
              <div className="text-sm font-medium">45,414</div>
            </div>
            <div className="text-xs text-gray-500">Boys (47%)</div>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-[#FFD43B]"></div>
              <div className="text-sm font-medium">40,270</div>
            </div>
            <div className="text-xs text-gray-500">Girls (53%)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

