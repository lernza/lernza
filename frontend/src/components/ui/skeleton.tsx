import * as React from "react"
import { cn } from "@/lib/utils"

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "animate-pulse bg-muted border-[2px] border-black",
        className
      )}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card border-[3px] border-black shadow-[5px_5px_0_#000]",
        className
      )}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="w-8 h-8" />
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
        "bg-card border-[2px] border-black shadow-[3px_3px_0_#000]",
        className
      )}
    >
      <div className="p-5 flex items-start gap-4">
        <Skeleton className="w-8 h-8 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-1/2" />
            <div className="flex gap-2 flex-shrink-0">
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
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border-[2px] border-black shadow-[3px_3px_0_#000] p-4 flex items-center gap-3"
        >
          <Skeleton className="w-10 h-10 flex-shrink-0" />
          <div className="space-y-2 flex-1">
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
        "bg-card border-[3px] border-black shadow-[6px_6px_0_#000] overflow-hidden",
        className
      )}
    >
      <div className="h-20 sm:h-28 relative bg-primary">
        <div className="absolute inset-0 bg-diagonal-lines opacity-20" />
      </div>
      <div className="bg-white border-t-[3px] border-black px-6 py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 -mt-14 sm:-mt-16">
          <Skeleton className="w-20 h-20 border-[3px] border-black shadow-[4px_4px_0_#000] flex-shrink-0" />
          <div className="flex-1 min-w-0 mt-2 sm:mt-6 space-y-2">
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
          className="bg-card border-[2px] border-black shadow-[3px_3px_0_#000] p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 flex-shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="space-y-2 flex flex-col items-end">
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
        "bg-primary border-[3px] border-black shadow-[6px_6px_0_#000] p-6 sm:p-8 mb-8",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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