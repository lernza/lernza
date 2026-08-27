import { useState, useEffect, useCallback, lazy, Suspense } from "react"
import type { ReactNode } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Navbar } from "@/components/navbar"
import { ToastContainer } from "@/components/toast"
import { Landing } from "@/pages/landing"
import { Profile } from "@/pages/profile"
import { NotFound } from "@/pages/not-found"
import { ErrorBoundary, ErrorBoundaryProvider, SectionErrorBoundary } from "@/components/error-boundary"
import { TermsOfService } from "@/pages/terms"
import { PrivacyPolicy } from "@/pages/privacy"
import { PageSkeleton } from "@/components/page-skeleton"
import { NotificationProvider } from "@/contexts/notification-context"
import { I18nProvider } from "@/i18n"
import { useWallet } from "@/hooks/use-wallet"
import { OnboardingTutorial } from "@/components/onboarding-tutorial"
import { useOnboarding } from "@/hooks/use-onboarding"
import { reconcilePendingTransactions } from "@/lib/contracts/client"

// Code-split heavy pages — they load on first visit to that route.
const Dashboard = lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.Dashboard })))
const QuestView = lazy(() => import("@/pages/quest").then((m) => ({ default: m.QuestView })))
const CreateQuest = lazy(() => import("@/pages/create-quest").then((m) => ({ default: m.CreateQuest })))
const Leaderboard = lazy(() => import("@/pages/leaderboard").then((m) => ({ default: m.Leaderboard })))
const History = lazy(() => import("@/pages/history").then((m) => ({ default: m.History })))
const CreatorProfile = lazy(() => import("@/pages/creator").then((m) => ({ default: m.CreatorProfile })))
const CreatorDashboard = lazy(() => import("@/pages/creator-dashboard").then((m) => ({ default: m.CreatorDashboard })))
const AnalyticsPage = lazy(() => import("@/pages/analytics").then((m) => ({ default: m.Analytics })))
import { useToast } from "@/hooks/use-toast"
import { subscribeToasts } from "@/lib/notifications"
import { useQuestEventStream } from "@/hooks/use-quest-events"

// ─── Routing ───────────────────────────────────────────────────────────────────

const VALID_PAGES = [
  "landing",
  "dashboard",
  "profile",
  "create-quest",
  "creator-dashboard",
  "leaderboard",
  "history",
  "analytics",
  "terms",
  "privacy",
] as const
type Page = (typeof VALID_PAGES)[number] | "quest" | "creator" | "404"
const PROTECTED_PAGES: ReadonlySet<Page> = new Set(["profile", "create-quest", "creator-dashboard"])

function SessionGuard({ children, onDenied }: { children: ReactNode; onDenied: () => void }) {
  const { verifySession } = useWallet()
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    let active = true
    void verifySession().then(isValid => {
      if (!active) return
      if (isValid) setVerified(true)
      else onDenied()
    })
    return () => {
      active = false
    }
  }, [onDenied, verifySession])

  return verified ? <>{children}</> : <PageSkeleton />
}

function pathToPage(pathname: string): {
  page: Page
  questId: number | null
  creatorAddress: string | null
} {
  const clean = pathname.replace(/\/+$/, "") || "/"

  if (clean === "/") return { page: "landing", questId: null, creatorAddress: null }
  if (clean === "/dashboard") return { page: "dashboard", questId: null, creatorAddress: null }
  if (clean === "/profile") return { page: "profile", questId: null, creatorAddress: null }
  if (clean === "/create-quest" || clean === "/quest/create") {
    return { page: "create-quest", questId: null, creatorAddress: null }
  }
  if (clean === "/creator-dashboard") {
    return { page: "creator-dashboard", questId: null, creatorAddress: null }
  }
  if (clean === "/leaderboard") return { page: "leaderboard", questId: null, creatorAddress: null }
  if (clean === "/history") return { page: "history", questId: null, creatorAddress: null }
  if (clean === "/analytics") return { page: "analytics", questId: null, creatorAddress: null }
  if (clean === "/terms") return { page: "terms", questId: null, creatorAddress: null }
  if (clean === "/privacy") return { page: "privacy", questId: null, creatorAddress: null }

  const questMatch = clean.match(/^\/quest\/(\d+)$/)
  if (questMatch) {
    return { page: "quest", questId: Number(questMatch[1]), creatorAddress: null }
  }

  const creatorMatch = clean.match(/^\/creator\/([^/]+)$/)
  if (creatorMatch) {
    return {
      page: "creator",
      questId: null,
      creatorAddress: decodeURIComponent(creatorMatch[1]),
    }
  }

  return { page: "404", questId: null, creatorAddress: null }
}

function pageToPath(page: Page, questId: number | null, creatorAddress: string | null): string {
  if (page === "landing") return "/"
  if (page === "quest" && questId !== null) return `/quest/${questId}`
  if (page === "creator" && creatorAddress) return `/creator/${encodeURIComponent(creatorAddress)}`
  return `/${page}`
}

// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [state, setState] = useState(() => pathToPage(window.location.pathname))
  const { toasts, addToast, removeToast } = useToast()
  const onboarding = useOnboarding()
  const { connected } = useWallet()
  useQuestEventStream(connected)

  // Auto-trigger the tutorial the first time a wallet connects (if not yet completed)
  useEffect(() => {
    if (connected && !onboarding.completed && !onboarding.isOpen) {
      onboarding.open(0)
    }
    // We only want this to fire when `connected` transitions to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  useEffect(() => {
    const onPopState = () => setState(pathToPage(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  // Issue #1478: resolve any wallet transactions that were still awaiting
  // confirmation when the page was last closed or reloaded.
  useEffect(() => {
    void reconcilePendingTransactions()
  }, [])

  const handleNavigate = useCallback((p: string) => {
    const page = (VALID_PAGES as readonly string[]).includes(p) ? (p as Page) : "404"
    const path = pageToPath(page, null, null)
    window.history.pushState(null, "", path)
    setState({ page, questId: null, creatorAddress: null })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleSelectQuest = useCallback((id: number) => {
    const path = pageToPath("quest", id, null)
    window.history.pushState(null, "", path)
    setState({ page: "quest", questId: id, creatorAddress: null })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const redirectToLanding = useCallback(() => {
    window.history.replaceState(null, "", "/")
    setState({ page: "landing", questId: null, creatorAddress: null })
  }, [])

  useEffect(() => {
    return subscribeToasts(({ message, type, duration }) => {
      addToast(message, type ?? "info", duration)
    })
  }, [addToast])

  const renderPage = () => {
    const page = state.page
    if (page === "quest" && state.questId !== null) {
      return (
        <Suspense fallback={<PageSkeleton />}>
          <QuestView questId={state.questId} onBack={() => handleNavigate("dashboard")} />
        </Suspense>
      )
    }

    switch (page) {
      case "landing":
        return <Landing onNavigate={handleNavigate} />
      case "dashboard":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard
              onSelectQuest={handleSelectQuest}
              onCreateQuest={() => handleNavigate("create-quest")}
              onLaunchTutorial={() => onboarding.open(0)}
            />
          </Suspense>
        )
      case "create-quest":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <CreateQuest onBack={() => handleNavigate("dashboard")} />
          </Suspense>
        )
      case "profile":
        return <Profile />
      case "leaderboard":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <Leaderboard />
          </Suspense>
        )
      case "history":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <History />
          </Suspense>
        )
      case "analytics":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <AnalyticsPage />
          </Suspense>
        )
      case "creator":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <CreatorProfile address={state.creatorAddress} />
          </Suspense>
        )
      case "creator-dashboard":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <CreatorDashboard />
          </Suspense>
        )
      case "terms":
        return <TermsOfService />
      case "privacy":
        return <PrivacyPolicy />
      default:
        return <NotFound onNavigate={handleNavigate} />
    }
  }

  return (
    <I18nProvider>
    <NotificationProvider>
      <ErrorBoundaryProvider>
        <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
          <div className="bg-background text-foreground min-h-screen">
            {/* Skip-to-content link: sr-only until focused, z-index above sticky navbar */}
            <a
              href="#main-content"
              className="focus:bg-background sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-current"
            >
              Skip to main content
            </a>
            <SectionErrorBoundary label="Navigation">
              <Navbar activePage={state.page} onNavigate={handleNavigate} onLaunchTutorial={() => onboarding.open(0)} />
            </SectionErrorBoundary>
            <ErrorBoundary key={`${state.page}-${state.questId ?? state.creatorAddress ?? ""}`}>
              <main id="main-content">
                {PROTECTED_PAGES.has(state.page) ? (
                  <SessionGuard onDenied={redirectToLanding}>{renderPage()}</SessionGuard>
                ) : (
                  renderPage()
                )}
              </main>
            </ErrorBoundary>
            <Analytics />
            <SpeedInsights />
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <OnboardingTutorial
              isOpen={onboarding.isOpen}
              currentStep={onboarding.currentStep}
              onNext={onboarding.next}
              onBack={onboarding.back}
              onClose={onboarding.close}
              onComplete={onboarding.complete}
            />
          </div>
        </ErrorBoundary>
      </ErrorBoundaryProvider>
    </NotificationProvider>
    </I18nProvider>
  )
}

export default App
