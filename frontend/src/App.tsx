import { useState, useEffect, useCallback } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Navbar } from "@/components/navbar"
import { ToastContainer } from "@/components/toast"
import { Landing } from "@/pages/landing"
import { Dashboard } from "@/pages/dashboard"
import { QuestView } from "@/pages/quest"
import { Profile } from "@/pages/profile"
import { NotFound } from "@/pages/not-found"
import { ErrorBoundary } from "@/components/error-boundary"
import { CreateQuest } from "@/pages/create-quest"
import { TermsOfService } from "@/pages/terms"
import { PrivacyPolicy } from "@/pages/privacy"
import { Leaderboard } from "@/pages/leaderboard"
import { CreatorProfile } from "@/pages/creator"
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

  // Legacy /workspace/:id links redirect to the renamed /quest/:id route.
  const legacyMatch = clean.match(/^\/workspace\/(\d+)$/)
  if (legacyMatch) {
    return { page: "quest", questId: Number(legacyMatch[1]), creatorAddress: null }
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
    if (state.page === "quest" && state.questId !== null) {
      return <QuestView questId={state.questId} onBack={() => handleNavigate("dashboard")} />
    }
    switch (state.page) {
      case "landing":
        return <Landing onNavigate={handleNavigate} />
      case "dashboard":
        return (
          <Dashboard
            onSelectQuest={handleSelectQuest}
            onCreateQuest={() => handleNavigate("create-quest")}
          />
        )
      case "create-quest":
        return <CreateQuest onBack={() => handleNavigate("dashboard")} />
      case "profile":
        return <Profile />
      case "leaderboard":
        return <Leaderboard />
      case "creator":
        return <CreatorProfile address={state.creatorAddress} />
      case "terms":
        return <TermsOfService />
      case "privacy":
        return <PrivacyPolicy />
      default:
        return <NotFound onNavigate={handleNavigate} />
    }
  }

  return (
    <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
      <div className="bg-background text-foreground min-h-screen">
        <Navbar activePage={state.page} onNavigate={handleNavigate} />
        <ErrorBoundary key={`${state.page}-${state.questId ?? state.creatorAddress ?? ""}`}>
          <main>{renderPage()}</main>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ErrorBoundary>
  )
}

export default App
