 
type Tab = "milestones" | "enrollees"

interface QuestTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  milestonesCount: number
  enrolleesCount: number
}

export function QuestTabs({
  activeTab,
  onTabChange,
  milestonesCount,
  enrolleesCount,
}: QuestTabsProps) {
  const tabs: Tab[] = ["milestones", "enrollees"]

  return (
    <div className="border-border mb-6 flex gap-0 border-b">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`-mb-[3px] cursor-pointer border border-b-0 px-6 py-3 text-sm font-semibold tracking-wider capitalize uppercase transition-all ${
            activeTab === tab
              ? "border-border bg-accent shadow-[2px_-2px_0_var(--color-border)]"
              : "hover:bg-secondary border-transparent"
          }`}
        >
          {tab}
          <span className="ml-2 text-xs opacity-60">
            ({tab === "milestones" ? milestonesCount : enrolleesCount})
          </span>
        </button>
      ))}
    </div>
  )
}
