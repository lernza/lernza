import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
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

// Theme Context

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

// Scroll to top on route change

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [pathname])
  return null
}

// App

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem("lernza-theme", theme)
    } catch {
      // localStorage unavailable (sandboxed iframe, private mode quota) - ignore
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === "light" ? "dark" : "light"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
        <BrowserRouter>
          <div className="bg-background text-foreground min-h-screen">
            <ScrollToTop />
            <Navbar />
            <ErrorBoundary>
              <main>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/quest/create" element={<CreateQuest />} />
                  <Route path="/quest/:id" element={<QuestView />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </ErrorBoundary>
            <Analytics />
            <SpeedInsights />
            <ToastViewport />
          </div>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeContext.Provider>
  )
}

function ToastViewport() {
  return <div id="toast-viewport" />
}

export default App
