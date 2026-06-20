import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100))
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn("border-border bg-secondary h-5 w-full border shadow-sm", className)}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            pct >= 100 ? "bg-success" : "bg-accent"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
