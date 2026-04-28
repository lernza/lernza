import { RouterProvider } from "react-router-dom"
import { MotionConfig } from "framer-motion"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/contexts/theme-context"
import { router } from "@/routes"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

/**
 * Root application component.
 *
 * Responsibilities:
 * - Assemble top-level providers (theme, routing, error boundaries)
 * - Delegate routing to react-router-dom data router
 * - Keep this component focused on composition, not implementation
 */
function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ErrorBoundary githubRepo="https://github.com/lernza/lernza">
          <RouterProvider router={router} />
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </ThemeProvider>
    </MotionConfig>
  )
}

export default App
