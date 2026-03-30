import * as React from "react"
import { cn } from "@/lib/utils"

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("bg-muted animate-pulse border-[2px] border-black", className)}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card border-[3px] border-black shadow-[5px_5px_0_var(--color-border)]",
        className
      )}
    >
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    </div>
  )
}

function SkeletonMilestone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card border-[2px] border-black shadow-[3px_3px_0_var(--color-border)]",
        className
      )}
    >
      <div className="flex items-start gap-4 p-5">
        <Skeleton className="h-8 w-8 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-1/2" />
            <div className="flex flex-shrink-0 gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
    </div>
  )
}

function SkeletonMilestoneList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMilestone key={i} />
      ))}
    </div>
  )
}

function SkeletonStatsRow({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex items-center gap-3 border-[2px] border-black p-4 shadow-[3px_3px_0_var(--color-border)]"
        >
          <Skeleton className="h-10 w-10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonProfileHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card overflow-hidden border-[3px] border-black shadow-[6px_6px_0_var(--color-border)]",
        className
      )}
    >
      <div className="bg-primary relative h-20 sm:h-28">
        <div className="bg-diagonal-lines absolute inset-0 opacity-20" />
      </div>
      <div className="border-t-[3px] border-black bg-white px-6 py-5">
        <div className="-mt-14 flex flex-col items-start gap-6 sm:-mt-16 sm:flex-row sm:items-center">
          <Skeleton className="h-20 w-20 flex-shrink-0 border-[3px] border-black shadow-[4px_4px_0_var(--color-border)]" />
          <div className="mt-2 min-w-0 flex-1 space-y-2 sm:mt-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-20 w-32 sm:mt-6" />
        </div>
      </div>
    </div>
  )
}

function SkeletonEarningsList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border-[2px] border-black p-5 shadow-[3px_3px_0_var(--color-border)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 flex-shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonWelcomeBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-primary mb-8 border-[3px] border-black p-6 shadow-[6px_6px_0_var(--color-border)] sm:p-8",
        className
      )}
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  )
}

function SkeletonQuestList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonMilestone,
  SkeletonMilestoneList,
  SkeletonStatsRow,
  SkeletonProfileHeader,
  SkeletonEarningsList,
  SkeletonWelcomeBanner,
  SkeletonQuestList,
}
