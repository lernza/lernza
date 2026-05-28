import { Suspense, type ReactNode } from "react"
import { createBrowserRouter } from "react-router-dom"
import { AppShell } from "@/components/app-shell"
import { WalletRequiredRoute } from "@/components/wallet-required-route"
import { PageSkeleton } from "@/components/page-skeleton"
import { QuestRedirect } from "@/components/workspace-redirect"
import { ErrorBoundary } from "@/components/error-boundary"

// Static page imports. We previously used React.lazy() with dynamic imports
// here so each page would code-split into its own chunk, but Vite 8 / Rolldown
// emits those dynamic imports as literal runtime fetches against the asset
// folder without ever emitting a matching chunk file (e.g. /assets/pages/landing
// 404s in production). Until that toolchain bug is resolved, ship one bundle
// so navigation actually works. Bundle size is unchanged — Rolldown was
// inlining all routes into the main chunk anyway.
import { Landing } from "./pages/landing"
import { Dashboard } from "./pages/dashboard"
import { QuestView } from "./pages/quest"
import { Profile } from "./pages/profile"
import { NotFound } from "./pages/not-found"
import { CreateQuest } from "./pages/create-quest"
import { Leaderboard } from "./pages/leaderboard"
import { CreatorProfile } from "./pages/creator"

function RouteShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ErrorBoundary routeLabel={label}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      errorElement: <ErrorBoundary routeLabel="App" />,
      children: [
        {
          index: true,
          element: (
            <RouteShell label="Landing">
              <Landing />
            </RouteShell>
          ),
        },
        {
          path: "dashboard",
          element: (
            <RouteShell label="Dashboard">
              <WalletRequiredRoute
                area="Dashboard"
                description="Connect your wallet to view your enrolled quests, rewards, and progress."
              >
                <Dashboard />
              </WalletRequiredRoute>
            </RouteShell>
          ),
        },
        {
          path: "quest/create",
          element: (
            <RouteShell label="Create Quest">
              <CreateQuest />
            </RouteShell>
          ),
        },
        {
          path: "quest/:id",
          element: (
            <RouteShell label="Quest">
              <WalletRequiredRoute
                area="Quest"
                description="Connect your wallet to open quest detail pages and interact with learner progress."
              >
                <QuestView />
              </WalletRequiredRoute>
            </RouteShell>
          ),
        },
        {
          path: "workspace/:id",
          element: <QuestRedirect />,
        },
        {
          path: "profile",
          element: (
            <RouteShell label="Profile">
              <WalletRequiredRoute
                area="Profile"
                description="Connect your wallet to load your on-chain earnings and account state."
              >
                <Profile />
              </WalletRequiredRoute>
            </RouteShell>
          ),
        },
        {
          path: "leaderboard",
          element: (
            <RouteShell label="Leaderboard">
              <Leaderboard />
            </RouteShell>
          ),
        },
        {
          path: "creator/:address",
          element: (
            <RouteShell label="Creator">
              <CreatorProfile />
            </RouteShell>
          ),
        },
        {
          path: "*",
          element: (
            <RouteShell label="Page">
              <NotFound />
            </RouteShell>
          ),
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL ?? "/",
  }
)
