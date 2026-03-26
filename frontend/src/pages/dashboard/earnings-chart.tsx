import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EarningsDataPoint } from "@/lib/mock-data"

interface EarningsChartProps {
  data: EarningsDataPoint[]
}

// SVG viewport dimensions
const W = 420
const H = 220
const PAD = { top: 16, right: 20, bottom: 36, left: 52 }
// Drawable area
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

export default function EarningsChart({ data }: EarningsChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(d => d.amount), 1)

  const xOf = (i: number) =>
    PAD.left + (data.length > 1 ? (i / (data.length - 1)) * CW : CW / 2)
  const yOf = (v: number) => PAD.top + (1 - v / maxVal) * CH

  const points = data.map((d, i) => ({ x: xOf(i), y: yOf(d.amount), d }))
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ")

  // 4 evenly-spaced Y grid ticks
  const yTicks = [0, 0.33, 0.67, 1].map(r => Math.round(maxVal * r))

  return (
    <Card className="border-border overflow-hidden border-[3px] shadow-[6px_6px_0_var(--color-border)]">
      <CardHeader className="bg-background border-border border-b-[2px] py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" /> Earnings History
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-background p-6">
        <div className="h-[220px] w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full"
            role="img"
            aria-label="Earnings history line chart"
          >
            {/* Horizontal grid lines + Y-axis labels */}
            {yTicks.map(tick => {
              const y = yOf(tick)
              return (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    y1={y}
                    x2={W - PAD.right}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={PAD.left - 6}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={10}
                    fontWeight="bold"
                    fill="#6b7280"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}

            {/* Axes */}
            <line
              x1={PAD.left}
              y1={PAD.top + CH}
              x2={W - PAD.right}
              y2={PAD.top + CH}
              stroke="#000"
              strokeWidth={2}
            />
            <line
              x1={PAD.left}
              y1={PAD.top}
              x2={PAD.left}
              y2={PAD.top + CH}
              stroke="#000"
              strokeWidth={2}
            />

            {/* X-axis labels */}
            {points.map((p, i) => (
              <text
                key={i}
                x={p.x}
                y={H - 8}
                textAnchor="middle"
                fontSize={11}
                fontWeight="bold"
                fill="#111"
              >
                {p.d.date}
              </text>
            ))}

            {/* Line */}
            <polyline
              points={polyline}
              fill="none"
              stroke="#000"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Dots and hover targets */}
            {points.map((p, i) => {
              const isHovered = hovered === i
              // Keep tooltip rect within SVG bounds
              const tipX = Math.min(Math.max(p.x - 44, PAD.left), W - PAD.right - 88)
              return (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 7 : 5}
                    fill={isHovered ? "#FACC15" : "#fff"}
                    stroke="#000"
                    strokeWidth={2.5}
                    style={{ transition: "r 0.1s, fill 0.1s" }}
                  />
                  {/* Invisible hit area */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={16}
                    fill="transparent"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  {/* Tooltip */}
                  {isHovered && (
                    <g>
                      <rect
                        x={tipX}
                        y={p.y - 40}
                        width={88}
                        height={26}
                        fill="#fff"
                        stroke="#000"
                        strokeWidth={2}
                        style={{ filter: "drop-shadow(3px 3px 0 #000)" }}
                      />
                      <text
                        x={tipX + 44}
                        y={p.y - 22}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight="bold"
                        fill="#111"
                      >
                        {p.d.date}: {p.d.amount} USDC
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
