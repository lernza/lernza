import { cn } from "@/lib/utils"

interface TabsNavigationProps {
  activeTab: "milestones" | "enrollees" | "timeline"
  onTabChange: (tab: "milestones" | "enrollees" | "timeline") => void
  milestonesCount: number
  enrolleesCount: number
}

export function TabsNavigation({
  activeTab,
  onTabChange,
  milestonesCount,
  enrolleesCount,
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
    }
  ]

  return (
    <div role="tablist" className="mb-8 flex gap-2 border-b-2 border-border">
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
              ? "border-b-2 border-primary text-foreground"
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
