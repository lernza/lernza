import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Navbar } from "@/components/navbar"
import { Landing } from "@/pages/landing"
import { Dashboard } from "@/pages/dashboard"
import { QuestView } from "@/pages/quest"
import { Profile } from "@/pages/profile"
import { NotFound } from "@/pages/not-found"
import { ErrorBoundary } from "@/components/error-boundary"
import { CreateQuest } from "@/pages/create-quest"

// ─── Theme Context ─────────────────────────────────────────────────────────────

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("lernza-theme")
    if (stored === "dark" || stored === "light") return stored
  } catch {
    return "light"
  }
  return "light"
}

// ─── Routing ───────────────────────────────────────────────────────────────────

const VALID_PAGES = ["landing", "dashboard", "profile", "create-quest"] as const
type Page = (typeof VALID_PAGES)[number] | "quest" | "404"

function pathToPage(pathname: string): { page: Page; questId: number | null } {
  const clean = pathname.replace(/\/+$/, "") || "/"

  if (clean === "/") return { page: "landing", questId: null }
  if (clean === "/dashboard") return { page: "dashboard", questId: null }
  if (clean === "/profile") return { page: "profile", questId: null }
  if (clean === "/create-quest") return { page: "create-quest", questId: null }

  const questMatch = clean.match(/^\/quest\/(\d+)$/)
  if (questMatch) return { page: "quest", questId: Number(questMatch[1]) }

  return { page: "404", questId: null }
}

function pageToPath(page: Page, questId: number | null): string {
  if (page === "landing") return "/"
  if (page === "quest" && questId !== null) return `/quest/${questId}`
  return `/${page}`
}

// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [state, setState] = useState(() => pathToPage(window.location.pathname))

  // Apply .dark class to <html> and persist preference
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem("lernza-theme", theme)
    } catch {
      // localStorage unavailable (sandboxed iframe, private mode quota) — ignore
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === "light" ? "dark" : "light"))
  }, [])

  useEffect(() => {
    const onPopState = () => setState(pathToPage(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const handleNavigate = useCallback((p: string) => {
    const page = (VALID_PAGES as readonly string[]).includes(p) ? (p as Page) : "404"
    const path = pageToPath(page, null)
    window.history.pushState(null, "", path)
    setState({ page, questId: null })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleSelectQuest = useCallback((id: number) => {
    const path = pageToPath("quest", id)
    window.history.pushState(null, "", path)
    setState({ page: "quest", questId: id })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

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
      default:
        return <NotFound onNavigate={handleNavigate} />
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
        <div className="bg-background text-foreground min-h-screen">
          <Navbar activePage={state.page} onNavigate={handleNavigate} />
          <ErrorBoundary key={`${state.page}-${state.questId ?? ""}`}>
            <main>{renderPage()}</main>
          </ErrorBoundary>
          <Analytics />
          <SpeedInsights />
          <ToastViewport />
        </div>
      </ErrorBoundary>
    </ThemeContext.Provider>
  )
}

function ToastViewport() {
  // Simple placeholder for toast viewport if used by upstream additions
  return <div id="toast-viewport" />
}

export default App
