import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { ErrorBoundary } from "@/components/error-boundary"
import { AppRouter } from "@/components/app-router"
import { useWallet } from "@/hooks/use-wallet"
import { AlertTriangle, X } from "lucide-react"
import { useState } from "react"

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

/**
 * App shell component that provides the main layout structure,
 * navigation, analytics, and routing.
 */
export function AppShell() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <a
        href="#main-content"
        className="bg-background text-foreground focus-visible:ring-ring sr-only absolute top-4 left-4 z-[100] px-4 py-2 font-bold opacity-0 transition-opacity focus-visible:not-sr-only focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <NetworkMismatchBanner />
      <Navbar />
      <ErrorBoundary>
        <main id="main-content" tabIndex={-1} className="outline-none">
          <h1 className="sr-only">Lernza Platform</h1>
          <AppRouter />
        </main>
      </ErrorBoundary>
      <ToastViewport />
    </div>
  )
}
