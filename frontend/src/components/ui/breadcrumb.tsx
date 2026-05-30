import { ChevronRight } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

/**
 * Breadcrumb — renders a small "Back to X > Current" trail above PageHeaders.
 * The last item is the current page (no onClick).
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="text-muted-foreground h-3 w-3" aria-hidden />}
            {isLast || !item.onClick ? (
              <span className={isLast ? "font-bold" : "text-muted-foreground"}>{item.label}</span>
            ) : (
              <button
                onClick={item.onClick}
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
