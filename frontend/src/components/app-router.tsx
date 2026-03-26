import { Suspense, lazy } from "react"
import { Routes, Route } from "react-router-dom"
import { WalletRequiredRoute } from "@/components/wallet-required-route"
import { PageSkeleton } from "@/components/page-skeleton"

// Lazy load page components
const Landing = lazy(() => import("@/pages/landing"))
const Dashboard = lazy(() => import("@/pages/dashboard"))
const QuestView = lazy(() => import("@/pages/quest"))
const Profile = lazy(() => import("@/pages/profile"))
const NotFound = lazy(() => import("@/pages/not-found"))
const CreateQuest = lazy(() => import("@/pages/create-quest"))

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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
