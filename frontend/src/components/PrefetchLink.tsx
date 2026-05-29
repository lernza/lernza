import { useCallback, type ReactNode } from "react"
import { Link, type LinkProps } from "react-router-dom"

// Static map of route paths → their lazy import functions.
// PrefetchLink calls the matching import on hover so the chunk is cached
// before the user actually clicks.
const routeImports: Record<string, () => Promise<unknown>> = {
  "/": () => import("../pages/landing"),
  "/dashboard": () => import("../pages/dashboard"),
  "/quest/create": () => import("../pages/create-quest"),
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

interface PrefetchLinkProps extends LinkProps {
  to: string
  children: ReactNode
}

export function PrefetchLink({ to, children, ...props }: PrefetchLinkProps) {
  const handleMouseEnter = useCallback(() => {
    const fn = getRouteImport(to)
    if (fn) fn()
  }, [to])

  return (
    <Link to={to} onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </Link>
  )
}
