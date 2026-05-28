import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** Short uppercase label rendered above the title (rendered as a yellow pill). */
  eyebrow?: ReactNode
  /** Page title — rendered as <h1> in the display font. */
  title: ReactNode
  /** One-line subtitle / lede beneath the title. */
  subtitle?: ReactNode
  /** Right-aligned action slot (button, link, badge). */
  action?: ReactNode
  className?: string
}

/**
 * Canonical top-of-page header.
 *
 * Every authenticated page should use this so titles, eyebrows, and rightward
 * actions align across the app. The component wraps content in a flex row on
 * larger screens and stacks on mobile.
 */
export function PageHeader({ eyebrow, title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "animate-fade-in-up mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="bg-primary border-border mb-4 inline-flex items-center gap-2 border-[3px] px-3 py-1.5 text-xs font-black tracking-wider uppercase shadow-[3px_3px_0_var(--color-border)]">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl leading-tight font-black sm:text-4xl lg:text-5xl">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm font-medium sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}
