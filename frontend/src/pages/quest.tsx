// frontend/src/pages/quest.tsx (refactored)
import { useState, useMemo } from "react"
import { ToastContainer } from "@/components/toast"
import { useToast } from "@/hooks/use-toast"
import { MOCK_QUESTS, MOCK_MILESTONES, MOCK_ENROLLEES, MOCK_COMPLETIONS } from "@/lib/mock-data"
import { QuestHeaderPanel } from "@/components/quest/QuestHeaderPanel"
import { StatsPanel } from "@/components/quest/StatsPanel"
import { ProgressPanel } from "@/components/quest/ProgressPanel"
import { TabsNavigation } from "@/components/quest/TabsNavigation"
import { MilestonesSection } from "@/components/quest/MilestonesSection"
import { EnrolleesSection } from "@/components/quest/EnrolleesSection"
import { Button } from "@/components/ui/button"

interface QuestViewProps {
  questId: number
  onBack: () => void
}

type Tab = "milestones" | "enrollees"

export function QuestView({ questId, onBack }: QuestViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("milestones")
  const { toasts, addToast, removeToast } = useToast()

  const quest = MOCK_QUESTS.find(q => q.id === questId)
  const milestones = MOCK_MILESTONES[questId] || []
  const enrollees = MOCK_ENROLLEES[questId] || []
  const completions = MOCK_COMPLETIONS[questId] || []

  // Memoised derivations — avoids re-running array traversals on every render (#921)
  const { totalReward, completedMilestones, isComplete, earnedReward } = useMemo(() => {
    const total = milestones.reduce((sum, m) => sum + m.rewardAmount, 0)
    const completedSet = new Set(completions.filter(c => c.completed).map(c => c.milestoneId))
    const completed = completedSet.size
    return {
      totalReward: total,
      completedMilestones: completed,
      isComplete: completed === milestones.length && milestones.length > 0,
      earnedReward: milestones
        .filter(m => completedSet.has(m.id))
        .reduce((sum, m) => sum + m.rewardAmount, 0),
    }
  }, [milestones, completions])

  const handleAddEnrollee = () => {
    // TODO: Implement add enrollee logic
    addToast({ message: "Add enrollee clicked", type: "info" })
  }

  const handleAddMilestone = () => {
    // TODO: Implement add milestone logic
    addToast({ message: "Add milestone clicked", type: "info" })
  }

  const handleVerifyCompletion = (milestoneId: number) => {
    // TODO: Implement verify completion logic
    addToast({ message: `Verified milestone ${milestoneId}`, type: "success" })
  }

  if (!quest) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="mb-4 text-2xl font-semibold">Quest not found</h2>
        <Button variant="outline" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Background */}
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      <QuestHeaderPanel
        questId={questId}
        questName={quest.name}
        questDescription={quest.description}
        isComplete={isComplete}
        onBack={onBack}
        onAddEnrollee={handleAddEnrollee}
        onAddMilestone={handleAddMilestone}
        onToast={addToast}
      />

      <StatsPanel
        enrolleesCount={enrollees.length}
        milestonesCount={milestones.length}
        poolBalance={quest.poolBalance}
        totalReward={totalReward}
      />

      <ProgressPanel
        completedMilestones={completedMilestones}
        totalMilestones={milestones.length}
        earnedReward={earnedReward}
      />

      <TabsNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        milestonesCount={milestones.length}
        enrolleesCount={enrollees.length}
      />

      {activeTab === "milestones" && (
        <MilestonesSection
          milestones={milestones}
          completions={completions}
          enrollees={enrollees}
          questId={questId}
          onAddMilestone={handleAddMilestone}
          onVerifyCompletion={handleVerifyCompletion}
        />
      )}

      {activeTab === "enrollees" && (
        <EnrolleesSection
          enrollees={enrollees}
          milestones={milestones}
          completions={completions}
          onAddEnrollee={handleAddEnrollee}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
