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
const APP_VERSION = "v0.0.0"

const FOOTER_LINKS = [
  { label: "About", href: "/" },
  { label: "Docs", href: "https://github.com/lernza/lernza/tree/main/docs" },
  { label: "Contact", href: "mailto:hello@lernza.dev" },
] as const

/**
 * App shell component that provides the main layout structure,
 * navigation, analytics, and routing.
 */
export function AppShell() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="bg-background text-foreground focus-visible:ring-ring sr-only absolute top-4 left-4 z-[100] px-4 py-2 font-bold opacity-0 transition-opacity focus-visible:not-sr-only focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <Navbar />
      <ErrorBoundary>
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          <h1 className="sr-only">Lernza Platform</h1>
          <AppRouter />
        </main>
      </ErrorBoundary>
      <footer className="border-border bg-secondary/40 border-t-[3px]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black tracking-wide uppercase">Lernza</p>
            <p className="text-muted-foreground mt-1 text-xs font-medium">
              Learn-to-earn quests on Stellar.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-3 text-sm font-bold">
            {FOOTER_LINKS.map(link => (
              <a key={link.label} href={link.href} className="hover:underline">
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/lernza/lernza/blob/main/LICENSE"
              className="hover:underline"
            >
              License
            </a>
          </nav>
          <p className="text-muted-foreground font-mono text-xs font-bold">Version {APP_VERSION}</p>
        </div>
      </footer>
      {enableAnalytics && <Analytics />}
      {enableAnalytics && <SpeedInsights />}
      <ToastViewport />
    </div>
  )
}
