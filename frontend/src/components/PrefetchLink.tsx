import { useCallback, type AnchorHTMLAttributes, type MouseEvent, type FocusEvent, type ReactNode } from "react"
import { isPlainLeftClick, navigateToPath } from "@/lib/navigation"

// Static map of route paths → their lazy import functions.
// PrefetchLink calls the matching import on hover so the chunk is cached
// before the user actually clicks.
const routeImports: Record<string, () => Promise<unknown>> = {
  "/": () => import("../pages/landing"),
  "/dashboard": () => import("../pages/dashboard"),
  "/create-quest": () => import("../pages/create-quest"),
  "/profile": () => import("../pages/profile"),
  "/leaderboard": () => import("../pages/leaderboard"),
}

// Dynamic segments (/quest/:id, /creator/:address) share a prefix match.
const prefixImports: [string, () => Promise<unknown>][] = [
  ["/quest/", () => import("../pages/quest")],
  ["/creator/", () => import("../pages/creator")],
]

function getRouteImport(to: string): (() => Promise<unknown>) | undefined {
  if (routeImports[to]) return routeImports[to]
  for (const [prefix, fn] of prefixImports) {
    if (to.startsWith(prefix)) return fn
  }
  return undefined
}

interface PrefetchLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  children: ReactNode
}

export function PrefetchLink({ to, children, onClick, onFocus, ...props }: PrefetchLinkProps) {
  const prefetch = useCallback(() => {
    const fn = getRouteImport(to)
    if (fn) void fn()
  }, [to])

  const handleMouseEnter = useCallback(() => {
    prefetch()
  }, [prefetch])

  // Keyboard users tab to links without hovering — prefetch on focus too so
  // route chunks are warm before Enter is pressed (issue #1625).
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLAnchorElement>) => {
      onFocus?.(event)
      if (event.defaultPrevented) return
      prefetch()
    },
    [onFocus, prefetch]
  )

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented || !isPlainLeftClick(event)) return

      event.preventDefault()
      navigateToPath(to)
    },
    [onClick, to]
  )

  return (
    <a href={to} onClick={handleClick} onMouseEnter={handleMouseEnter} onFocus={handleFocus} {...props}>
      {children}
    </a>
  )
}
