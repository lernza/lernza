/**
 * Lightweight page skeleton for lazy-loaded pages.
 * Uses CSS-only pulse animation instead of a JS spinner to avoid
 * blocking the main thread during code-split chunk loads.
 */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted h-4 w-72 animate-pulse rounded" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-muted h-40 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  )
}
