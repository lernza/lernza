import { Suspense, lazy, type ReactNode } from "react"
import { createBrowserRouter } from "react-router-dom"
import { AppShell } from "@/components/app-shell"
import { WalletRequiredRoute } from "@/components/wallet-required-route"
import { PageSkeleton } from "@/components/page-skeleton"
import { QuestRedirect } from "@/components/workspace-redirect"
import { ErrorBoundary } from "@/components/error-boundary"

// Lazy-loaded page chunks — each route downloads only when navigated to.
const Landing = lazy(() => import("./pages/landing").then(m => ({ default: m.Landing })))
const Dashboard = lazy(() => import("./pages/dashboard").then(m => ({ default: m.Dashboard })))
const QuestView = lazy(() => import("./pages/quest").then(m => ({ default: m.QuestView })))
const Profile = lazy(() => import("./pages/profile").then(m => ({ default: m.Profile })))
const NotFound = lazy(() => import("./pages/not-found").then(m => ({ default: m.NotFound })))
const CreateQuest = lazy(() => import("./pages/create-quest").then(m => ({ default: m.CreateQuest })))
const Leaderboard = lazy(() => import("./pages/leaderboard").then(m => ({ default: m.Leaderboard })))
const CreatorProfile = lazy(() => import("./pages/creator").then(m => ({ default: m.CreatorProfile })))
const TermsOfService = lazy(() => import("./pages/terms").then(m => ({ default: m.TermsOfService })))
const PrivacyPolicy = lazy(() => import("./pages/privacy").then(m => ({ default: m.PrivacyPolicy })))

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
          path: "terms",
          element: (
            <RouteShell label="Terms">
              <TermsOfService />
            </RouteShell>
          ),
        },
        {
          path: "privacy",
          element: (
            <RouteShell label="Privacy">
              <PrivacyPolicy />
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
