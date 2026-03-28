import { Suspense, lazy } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { WalletRequiredRoute } from "@/components/wallet-required-route"
import { PageSkeleton } from "@/components/page-skeleton"
import { WorkspaceRedirect } from "@/components/workspace-redirect"

// Lazy load page components
const Landing = lazy(() => import("@/pages/landing").then(module => ({ default: module.Landing })))
const Dashboard = lazy(() =>
  import("@/pages/dashboard").then(module => ({ default: module.Dashboard }))
)
const QuestView = lazy(() =>
  import("@/pages/quest").then(module => ({ default: module.QuestView }))
)
const Profile = lazy(() => import("@/pages/profile").then(module => ({ default: module.Profile })))
const NotFound = lazy(() =>
  import("@/pages/not-found").then(module => ({ default: module.NotFound }))
)
const CreateQuest = lazy(() =>
  import("@/pages/create-quest").then(module => ({ default: module.CreateQuest }))
)
const Leaderboard = lazy(() =>
  import("@/pages/leaderboard").then(module => ({ default: module.Leaderboard }))
)

export function AppRouter() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <WalletRequiredRoute
              area="Dashboard"
              description="Connect your wallet to view your enrolled quests, rewards, and progress."
            >
              <Dashboard />
            </WalletRequiredRoute>
          }
        />
        <Route path="/quest/create" element={<CreateQuest />} />
        <Route
          path="/quest/:id"
          element={
            <WalletRequiredRoute
              area="Workspace"
              description="Connect your wallet to open quest detail pages and interact with learner progress."
            >
              <QuestView />
            </WalletRequiredRoute>
          }
        />
        <Route path="/workspace/:id" element={<WorkspaceRedirect />} />
        <Route
          path="/profile"
          element={
            <WalletRequiredRoute
              area="Profile"
              description="Connect your wallet to load your on-chain earnings and account state."
            >
              <Profile />
            </WalletRequiredRoute>
          }
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
