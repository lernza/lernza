import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Navbar } from "@/components/navbar"
import { ErrorBoundary } from "@/components/error-boundary"
import { AppRouter } from "@/components/app-router"

/**
 * Scroll to top on route change
 */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [pathname])

  return null
}

/**
 * Toast viewport container
 */
function ToastViewport() {
  return <div id="toast-viewport" />
}

const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === "true"

/**
 * App shell component that provides the main layout structure,
 * navigation, analytics, and routing.
 */
export function AppShell() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <a
        href="#main-content"
        className="bg-background text-foreground focus-visible:ring-ring sr-only absolute top-4 left-4 z-[100] px-4 py-2 font-bold opacity-0 transition-opacity focus-visible:not-sr-only focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <Navbar />
      <ErrorBoundary>
        <main id="main-content" tabIndex={-1} className="outline-none">
          <h1 className="sr-only">Lernza Platform</h1>
          <AppRouter />
        </main>
      </ErrorBoundary>
      {enableAnalytics && <Analytics />}
      {enableAnalytics && <SpeedInsights />}
      <ToastViewport />
    </div>
  )
}
