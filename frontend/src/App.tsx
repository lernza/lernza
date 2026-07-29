import { useState, useEffect, useCallback, lazy, Suspense } from "react"
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

// Code-split heavy pages — they load on first visit to that route.
const Dashboard = lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.Dashboard })))
const QuestView = lazy(() => import("@/pages/quest").then((m) => ({ default: m.QuestView })))
const CreateQuest = lazy(() => import("@/pages/create-quest").then((m) => ({ default: m.CreateQuest })))
const Leaderboard = lazy(() => import("@/pages/leaderboard").then((m) => ({ default: m.Leaderboard })))
const CreatorProfile = lazy(() => import("@/pages/creator").then((m) => ({ default: m.CreatorProfile })))
import { useToast } from "@/hooks/use-toast"
import { subscribeToasts } from "@/lib/notifications"

// ─── Routing ───────────────────────────────────────────────────────────────────

const VALID_PAGES = [
  "landing",
  "dashboard",
  "profile",
  "create-quest",
  "leaderboard",
  "terms",
  "privacy",
] as const
type Page = (typeof VALID_PAGES)[number] | "quest" | "creator" | "404"

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
  if (clean === "/leaderboard") return { page: "leaderboard", questId: null, creatorAddress: null }
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

  useEffect(() => {
    const onPopState = () => setState(pathToPage(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
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
      case "creator":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <CreatorProfile address={state.creatorAddress} />
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
              <Navbar activePage={state.page} onNavigate={handleNavigate} />
            </SectionErrorBoundary>
            <ErrorBoundary key={`${state.page}-${state.questId ?? state.creatorAddress ?? ""}`}>
              <main id="main-content">{renderPage()}</main>
            </ErrorBoundary>
            <Analytics />
            <SpeedInsights />
            <ToastContainer toasts={toasts} onRemove={removeToast} />
          </div>
        </ErrorBoundary>
      </ErrorBoundaryProvider>
    </NotificationProvider>
  )
}

export default App
