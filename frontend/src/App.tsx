import { BrowserRouter, MemoryRouter } from "react-router-dom"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/contexts/theme-context"
import { AppShell } from "@/components/app-shell"
import { isBrowserEnvironment } from "@/lib/browser"

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
  const Router = isBrowserEnvironment() ? BrowserRouter : MemoryRouter

  return (
    <ThemeProvider>
      <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
        <Router>
          <AppShell />
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
