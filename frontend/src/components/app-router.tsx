import { Suspense, lazy } from "react"
import { Routes, Route } from "react-router-dom"
import { WalletRequiredRoute } from "@/components/wallet-required-route"
import { PageSkeleton } from "@/components/page-skeleton"
import { WorkspaceRedirect } from "@/components/workspace-redirect"
import { ErrorBoundary } from "@/components/error-boundary"

// ---------------------------------------------------------------------------
// Lazy page imports — each produces a dedicated Rollup/Vite chunk so the
// initial bundle only contains what the first visited route needs.
// ---------------------------------------------------------------------------

const Landing = lazy(() =>
  import(/* @vite-chunk-include, webpackChunkName: "page-landing" */ "@/pages/landing").then(
    module => ({ default: module.Landing })
  )
)
const Dashboard = lazy(() =>
  import(/* @vite-chunk-include, webpackChunkName: "page-dashboard" */ "@/pages/dashboard").then(
    module => ({ default: module.Dashboard })
  )
)
const QuestView = lazy(() =>
  import(/* @vite-chunk-include, webpackChunkName: "page-quest" */ "@/pages/quest").then(
    module => ({ default: module.QuestView })
  )
)
const Profile = lazy(() =>
  import(/* @vite-chunk-include, webpackChunkName: "page-profile" */ "@/pages/profile").then(
    module => ({ default: module.Profile })
  )
)
const NotFound = lazy(() =>
  import(/* @vite-chunk-include, webpackChunkName: "page-not-found" */ "@/pages/not-found").then(
    module => ({ default: module.NotFound })
  )
)
const CreateQuest = lazy(() =>
  import(
    /* @vite-chunk-include, webpackChunkName: "page-create-quest" */ "@/pages/create-quest"
  ).then(module => ({ default: module.CreateQuest }))
)
const Leaderboard = lazy(() =>
  import(
    /* @vite-chunk-include, webpackChunkName: "page-leaderboard" */ "@/pages/leaderboard"
  ).then(module => ({ default: module.Leaderboard }))
)

// ---------------------------------------------------------------------------
// Helper: wrap a page element with per-route Suspense + ErrorBoundary so each
// route streams independently and errors show a contextual retry CTA.
// ---------------------------------------------------------------------------

function RouteShell({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <ErrorBoundary routeLabel={label}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RouteShell label="Landing">
            <Landing />
          </RouteShell>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RouteShell label="Dashboard">
            <WalletRequiredRoute
              area="Dashboard"
              description="Connect your wallet to view your enrolled quests, rewards, and progress."
            >
              <Dashboard />
            </WalletRequiredRoute>
          </RouteShell>
        }
      />

      <Route
        path="/quest/create"
        element={
          <RouteShell label="Create Quest">
            <CreateQuest />
          </RouteShell>
        }
      />

      <Route
        path="/quest/:id"
        element={
          <RouteShell label="Quest">
            <WalletRequiredRoute
              area="Workspace"
              description="Connect your wallet to open quest detail pages and interact with learner progress."
            >
              <QuestView />
            </WalletRequiredRoute>
          </RouteShell>
        }
      />

      <Route path="/workspace/:id" element={<WorkspaceRedirect />} />

      <Route
        path="/profile"
        element={
          <RouteShell label="Profile">
            <WalletRequiredRoute
              area="Profile"
              description="Connect your wallet to load your on-chain earnings and account state."
            >
              <Profile />
            </WalletRequiredRoute>
          </RouteShell>
        }
      />

      <Route
        path="/leaderboard"
        element={
          <RouteShell label="Leaderboard">
            <Leaderboard />
          </RouteShell>
        }
      />

      <Route
        path="*"
        element={
          <RouteShell label="Page">
            <NotFound />
          </RouteShell>
        }
      />
    </Routes>
  )
}
