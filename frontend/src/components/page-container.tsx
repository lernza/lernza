import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageWidth = "default" | "narrow" | "wide"

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** When false, omits the default vertical padding so callers can control it. */
  pad?: boolean
  /**
   * Container width. Defaults to `default` (max-w-7xl) for dashboards and
   * detail pages. Use `narrow` (max-w-3xl) for list-oriented pages like the
   * leaderboard where dense rows read better in a tighter column. `wide`
   * (max-w-screen-2xl) is reserved for marketing/landing.
   */
  width?: PageWidth
}

const WIDTH_CLASS: Record<PageWidth, string> = {
  default: "max-w-7xl",
  narrow: "max-w-3xl",
  wide: "max-w-screen-2xl",
}

/**
 * One container for every authenticated page: centered with a consistent
 * horizontal gutter and predictable max-width. Pages should wrap their
 * entire content in this so widths, margins, and breakpoints match across
 * the app.
 */
export function PageContainer({
  children,
  pad = true,
  width = "default",
  className,
  ...rest
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        WIDTH_CLASS[width],
        pad && "py-8 sm:py-10",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
