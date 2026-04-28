import { Link, type LinkProps } from "react-router-dom";
import type { ReactNode } from "react";

interface PrefetchLinkProps extends LinkProps {
  to: string;
  children: ReactNode;
}

/**
 * A wrapper around react-router-dom Link that prefetches the page component on hover.
 */
export function PrefetchLink({ to, children, ...props }: PrefetchLinkProps) {
  const handleHover = () => {
    // Simple prefetch logic: dynamically import the page component.
    // This assumes the route path 'to' maps directly to a file in '../pages'.
    // e.g. /dashboard -> ../pages/dashboard.tsx
    
    // We try to normalize the path to match the page file structure
    // This is a simple implementation as requested.
    const pagePath = to.split('?')[0].split('#')[0];
    
    // Only prefetch if it's an internal link starting with /
    if (pagePath.startsWith('/')) {
      // Note: Vite requires dynamic imports to be relatively predictable
      // The user's requested pattern: import(`../pages${to}`)
      try {
        import(`../pages${pagePath}.tsx`).catch(() => {
          // If .tsx fails, try without extension (for directories with index.tsx or just .ts)
          import(`../pages${pagePath}`).catch(() => {});
        });
      } catch (e) {
        // Ignore prefetch errors
      }
    }
  };

  return (
    <Link to={to} onMouseEnter={handleHover} {...props}>
      {children}
    </Link>
  );
}
