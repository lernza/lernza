import { Loader2 } from "lucide-react"

/**
 * Full-page loading skeleton for lazy-loaded pages.
 * Shows a centered loading state with animated spinner.
 */
export function PageSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-bold">Loading...</p>
      </div>
    </div>
  )
}
