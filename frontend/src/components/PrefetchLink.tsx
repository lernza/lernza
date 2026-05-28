import { Link, type LinkProps } from "react-router-dom"
import type { ReactNode } from "react"

interface PrefetchLinkProps extends LinkProps {
  to: string
  children: ReactNode
}

/**
 * Thin wrapper around react-router-dom's <Link>. Historically this hooked the
 * onMouseEnter handler to call `import(\`../pages${path}\`)` and warm up the
 * lazy route chunk, but Vite 8 / Rolldown can't statically analyze a template
 * literal import — it leaves the call as a runtime fetch that 404s in
 * production. With routing now bundled as a single chunk (see routes.tsx),
 * there's nothing to prefetch, so this component just renders a Link.
 *
 * Kept as a separate component so existing call sites don't have to change
 * when we restore real route-level code splitting and prefetching.
 */
export function PrefetchLink({ to, children, ...props }: PrefetchLinkProps) {
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  )
}
