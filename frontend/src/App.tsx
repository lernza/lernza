import { BrowserRouter } from "react-router-dom"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/contexts/theme-context"
import { AppShell } from "@/components/app-shell"

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
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
