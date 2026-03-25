import { useState, useEffect, useCallback } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Navbar } from "@/components/navbar"
import { Landing } from "@/pages/landing"
import { Dashboard } from "@/pages/dashboard"
import { WorkspaceView } from "@/pages/workspace"
import { Profile } from "@/pages/profile"
import { NotFound } from "@/pages/not-found"
import { ErrorBoundary } from "@/components/error-boundary"
import { CreateQuest } from "@/pages/create-quest"

const VALID_PAGES = ["landing", "dashboard", "profile", "create-quest"] as const
type Page = (typeof VALID_PAGES)[number] | "workspace" | "404"

function pathToPage(pathname: string): { page: Page; workspaceId: number | null } {
  const clean = pathname.replace(/\/+$/, "") || "/"
  if (clean === "/") return { page: "landing", workspaceId: null }
  if (clean === "/dashboard") return { page: "dashboard", workspaceId: null }
  if (clean === "/profile") return { page: "profile", workspaceId: null }
  if (clean === "/create-quest") return { page: "create-quest", workspaceId: null }

  const wsMatch = clean.match(/^\/workspace\/(\d+)$/)
  if (wsMatch) return { page: "workspace", workspaceId: Number(wsMatch[1]) }
  return { page: "404", workspaceId: null }
}

function pageToPath(page: Page, workspaceId: number | null): string {
  if (page === "landing") return "/"
  if (page === "workspace" && workspaceId !== null) return `/workspace/${workspaceId}`
  return `/${page}`
}

function App() {
  const [state, setState] = useState(() => pathToPage(window.location.pathname))

  useEffect(() => {
    const onPopState = () => setState(pathToPage(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const handleNavigate = useCallback((p: string) => {
    const page = (VALID_PAGES as readonly string[]).includes(p) ? (p as Page) : "404"
    const path = pageToPath(page, null)
    window.history.pushState(null, "", path)
    setState({ page, workspaceId: null })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleSelectWorkspace = useCallback((id: number) => {
    const path = pageToPath("workspace", id)
    window.history.pushState(null, "", path)
    setState({ page: "workspace", workspaceId: id })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const renderPage = () => {
    if (state.page === "workspace" && state.workspaceId !== null) {
      return (
        <WorkspaceView
          workspaceId={state.workspaceId}
          onBack={() => handleNavigate("dashboard")}
        />
      )
    }
    switch (state.page) {
      case "landing":
        return <Landing onNavigate={handleNavigate} />
      case "dashboard":
        return (
          <Dashboard
            onSelectWorkspace={handleSelectWorkspace}
            onCreateQuest={() => handleNavigate("create-quest")}
          />
        )
      case "create-quest":
        return (
          <CreateQuest
            onBack={() => handleNavigate("dashboard")}
          />
        )
      case "profile":
        return <Profile />
      default:
        return <NotFound onNavigate={handleNavigate} />
    }
  }

  return (
    <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
      <div className="min-h-screen bg-background text-foreground">
        <Navbar activePage={state.page} onNavigate={handleNavigate} />
        <ErrorBoundary key={`${state.page}-${state.workspaceId ?? ""}`}>
          <main>{renderPage()}</main>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </div>
    </ErrorBoundary>
  )
}

export default App
