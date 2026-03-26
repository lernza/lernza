import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ProgressRingProps {
  progress: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
  animated?: boolean
}

const sizeConfig = {
  sm: { dimension: 48, strokeWidth: 4, fontSize: "text-xs" },
  md: { dimension: 80, strokeWidth: 6, fontSize: "text-sm" },
  lg: { dimension: 120, strokeWidth: 8, fontSize: "text-base" },
}

export function ProgressRing({
  progress,
  size = "md",
  showLabel = true,
  className,
  animated = true,
}: ProgressRingProps) {
  const config = sizeConfig[size]
  const { dimension, strokeWidth, fontSize } = config
  const radius = (dimension - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const [displayProgress, setDisplayProgress] = useState(animated ? 0 : progress)

  useEffect(() => {
    if (!animated) return
    const duration = 1000
    const start = performance.now()
    let raf: number

    const tick = (now: number) => {
      const elapsed = now - start
      const progressRatio = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progressRatio, 3) // ease-out cubic
      setDisplayProgress(Math.round(eased * progress))
      if (progressRatio < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress, animated])

  const offset = circumference - (displayProgress / 100) * circumference
  const isComplete = progress >= 100

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: dimension, height: dimension }}
    >
      <svg
        width={dimension}
        height={dimension}
        className={cn("transition-transform", isComplete && "animate-pulse-slow")}
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? "var(--color-success)" : "var(--color-primary)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
          style={{
            transform: `rotate(-90deg)`,
            transformOrigin: "50% 50%",
          }}
        />
      </svg>
      {showLabel && (
        <div
          className={cn(
            "absolute font-black",
            fontSize,
            isComplete ? "text-success" : "text-foreground"
          )}
        >
          {displayProgress}%
        </div>
      )}
    </div>
  )
}
