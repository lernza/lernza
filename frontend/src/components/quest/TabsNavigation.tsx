import { cn } from "@/lib/utils"

export type QuestTab = "milestones" | "enrollees" | "timeline" | "analytics" | "referrals"

interface TabsNavigationProps {
  activeTab: QuestTab
  onTabChange: (tab: QuestTab) => void
  milestonesCount: number
  enrolleesCount: number
  showAnalytics?: boolean
  showReferrals?: boolean
}

export function TabsNavigation({
  activeTab,
  onTabChange,
  milestonesCount,
  enrolleesCount,
  showAnalytics = true,
  showReferrals = true,
}: TabsNavigationProps) {
  const tabs = [
    {
      id: "milestones" as const,
      label: "Milestones",
      count: milestonesCount,
    },
    {
      id: "enrollees" as const,
      label: "Enrollees",
      count: enrolleesCount,
    },
    {
      id: "timeline" as const,
      label: "Timeline",
      count: undefined,
    },
    ...(showReferrals
      ? [
          {
            id: "referrals" as const,
            label: "Refer & Earn",
            count: undefined,
          },
        ]
      : []),
    ...(showAnalytics
      ? [
          {
            id: "analytics" as const,
            label: "Analytics",
            count: undefined,
          },
        ]
      : []),
  ]

  return (
    <div role="tablist" className="border-border mb-8 flex gap-2 border-b-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-3 text-sm font-semibold transition-all",
            activeTab === tab.id
              ? "border-primary text-foreground border-b-2"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-2 font-mono text-xs">({tab.count})</span>}
        </button>
      ))}
    </div>
  )
}
