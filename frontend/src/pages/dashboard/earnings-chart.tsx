import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  LineChart,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EarningsDataPoint } from "@/lib/mock-data"

interface EarningsChartProps {
  data: EarningsDataPoint[]
}

export default function EarningsChart({ data }: EarningsChartProps) {
  return (
    <Card className="border-border overflow-hidden border-[3px] shadow-[6px_6px_0_var(--color-border)]">
      <CardHeader className="bg-background border-border border-b-[2px] py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" /> Earnings History
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-background p-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontWeight: "bold", fontSize: 12 }}
                axisLine={{ stroke: "#000", strokeWidth: 2 }}
                tickLine={{ stroke: "#000", strokeWidth: 2 }}
              />
              <YAxis
                tick={{ fontWeight: "bold", fontSize: 12 }}
                axisLine={{ stroke: "#000", strokeWidth: 2 }}
                tickLine={{ stroke: "#000", strokeWidth: 2 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "2px solid #000",
                  boxShadow: "4px 4px 0 #000",
                  borderRadius: 0,
                  fontWeight: "bold",
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#000"
                strokeWidth={4}
                activeDot={{ r: 6, stroke: "#000", strokeWidth: 2, fill: "#FACC15" }}
                dot={{ r: 4, stroke: "#000", strokeWidth: 2, fill: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
