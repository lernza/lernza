import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  increase: string
  bgColor: string
}

function MetricCard({ title, value, increase, bgColor }: MetricCardProps) {
  return (
    <Card className={`border-none ${bgColor}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-green-600">
            <span className="mr-1 inline-flex items-center">
              <ArrowUpIcon className="mr-1 h-3 w-3" />
              {increase}
            </span>
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-gray-500">{title}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardMetrics() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Students" value="124,684" increase="15%" bgColor="bg-purple-50" />
      <MetricCard title="Teachers" value="12,379" increase="3%" bgColor="bg-yellow-50" />
      <MetricCard title="Staffs" value="29,300" increase="2%" bgColor="bg-yellow-100" />
      <MetricCard title="Awards" value="95,800" increase="5%" bgColor="bg-yellow-200" />
    </div>
  )
}

