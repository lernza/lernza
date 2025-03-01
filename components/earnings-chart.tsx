"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef } from "react"
import { Chart, registerables } from "chart.js"

Chart.register(...registerables)

export function EarningsChart() {
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
          type: "line",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [
              {
                label: "Income",
                data: [50000, 60000, 45000, 80000, 60000, 75000, 65000, 85000, 90000, 70000, 85000, 75000],
                borderColor: "#74C0FC",
                backgroundColor: "rgba(116, 192, 252, 0.1)",
                borderWidth: 2,
                fill: true,
                tension: 0.4,
              },
              {
                label: "Expense",
                data: [30000, 40000, 25000, 45000, 35000, 50000, 40000, 55000, 60000, 45000, 50000, 40000],
                borderColor: "#C4B5FD",
                backgroundColor: "rgba(196, 181, 253, 0.1)",
                borderWidth: 2,
                fill: true,
                tension: 0.4,
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
                ticks: {
                  callback: (value) => "$" + value / 1000 + "k",
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    let label = context.dataset.label || ""
                    if (label) {
                      label += ": "
                    }
                    if (context.parsed.y !== null) {
                      label += new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(context.parsed.y)
                    }
                    return label
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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Earnings</CardTitle>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 rounded-full bg-[#74C0FC]"></div>
            <span className="text-xs text-gray-500">Income</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 rounded-full bg-[#C4B5FD]"></div>
            <span className="text-xs text-gray-500">Expense</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[240px] w-full">
          <canvas ref={chartRef} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500">Sep 14, 2030</div>
          </div>
          <div className="flex space-x-4">
            <div>
              <div className="text-xs text-gray-500">Income</div>
              <div className="text-sm font-medium">$17,300</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Expense</div>
              <div className="text-sm font-medium">$5,000</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

