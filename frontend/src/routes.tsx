import { lazy, Suspense, type ReactNode } from "react"
import { createBrowserRouter } from "react-router-dom"
import { AppShell } from "@/components/app-shell"
import { WalletRequiredRoute } from "@/components/wallet-required-route"
import { PageSkeleton } from "@/components/page-skeleton"
import { WorkspaceRedirect } from "@/components/workspace-redirect"
import { ErrorBoundary } from "@/components/error-boundary"

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
const CreatorProfile = lazy(() =>
  import(/* @vite-chunk-include, webpackChunkName: "page-creator" */ "@/pages/creator").then(
    module => ({ default: module.CreatorProfile })
  )
)

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
                area="Workspace"
                description="Connect your wallet to open quest detail pages and interact with learner progress."
              >
                <QuestView />
              </WalletRequiredRoute>
            </RouteShell>
          ),
        },
        {
          path: "workspace/:id",
          element: <WorkspaceRedirect />,
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
