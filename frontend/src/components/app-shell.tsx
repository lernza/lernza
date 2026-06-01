import { useEffect, type ReactNode } from "react"
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Navbar } from "@/components/navbar"
import { ErrorBoundary } from "@/components/error-boundary"
import { useWallet } from "@/hooks/use-wallet"
import { AlertTriangle, X } from "lucide-react"
import { useState } from "react"

/**
 * Focus main content on route change for keyboard users.
 */
function FocusMainOnNavigation() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const main = document.getElementById("main-content")
    if (main) {
      main.focus()
    }
  }, [pathname, search])

  return null
}

/**
 * Toast viewport container
 */
function ToastViewport() {
  return <div id="toast-viewport" />
}

const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === "true"
const FOOTER_LINKS = [
  { label: "About", href: "/" },
  { label: "Docs", href: "https://github.com/lernza/lernza/tree/main/docs" },
  { label: "Contact", href: "mailto:hello@lernza.dev" },
] as const

/**
 * Network mismatch banner
 */
function NetworkMismatchBanner() {
  const { connected, wrongNetwork, networkName, expectedNetworkName } = useWallet()
  const [dismissed, setDismissed] = useState(false)

  if (!connected || !wrongNetwork || dismissed) return null

  return (
    <div className="bg-destructive text-destructive-foreground border-border animate-fade-in-down border-b-[3px] px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-background/20 flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-white/30">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Wrong Network Detected</p>
            <p className="text-xs font-bold opacity-90">
              Your wallet is connected to {networkName}. Please switch to {expectedNetworkName} in
              Freighter.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="hover:bg-background/20 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-[2px] border-white/30 transition-colors"
          aria-label="Dismiss network warning"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface AppShellProps {
  children?: ReactNode
}

/**
 * App shell component that provides the main layout structure,
 * navigation, analytics, and routing.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="bg-background text-foreground border-border sr-only absolute top-2 left-2 z-[200] border-[3px] px-4 py-2 font-bold shadow-[4px_4px_0_var(--color-border)] focus:not-sr-only focus:outline-2 focus:outline-offset-2 focus:outline-current"
      >
        Skip to main content
      </a>
      <FocusMainOnNavigation />
      <ScrollRestoration getKey={location => `${location.pathname}${location.search}`} />
      <NetworkMismatchBanner />
      <Navbar />
      <ErrorBoundary>
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
          {children}
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
          <p className="text-muted-foreground font-mono text-xs font-bold">Version v0.0.0</p>
        </div>
      </footer>
      {enableAnalytics && <Analytics />}
      {enableAnalytics && <SpeedInsights />}
      <ToastViewport />
    </div>
  )
}
