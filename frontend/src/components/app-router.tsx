import { Routes, Route } from "react-router-dom"
import { Landing } from "@/pages/landing"
import { Dashboard } from "@/pages/dashboard"
import { QuestView } from "@/pages/quest"
import { Profile } from "@/pages/profile"
import { NotFound } from "@/pages/not-found"
import { CreateQuest } from "@/pages/create-quest"
import { WalletRequiredRoute } from "@/components/wallet-required-route"

export function AppRouter() {
  return (
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
  )
}
