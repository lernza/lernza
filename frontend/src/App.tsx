import { BrowserRouter } from "react-router-dom"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/contexts/theme-context"
import { AppShell } from "@/components/app-shell"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

/**
 * Root application component.
 *
 * Responsibilities:
 * - Assemble top-level providers (theme, routing, error boundaries)
 * - Delegate routing to AppRouter
 * - Delegate layout to AppShell
 * - Keep this component focused on composition, not implementation
 */
function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
        <BrowserRouter>
          <AppShell />
          <Analytics />
          <SpeedInsights />
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
