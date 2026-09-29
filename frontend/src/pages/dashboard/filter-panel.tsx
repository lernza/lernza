import { LayoutDashboard } from "lucide-react"
import { useTranslation } from "@/i18n"
import { SearchFilter } from "./search-filter"
import { TagFilter } from "./tag-filter"
import { DiscoveryFilters } from "./discovery-filters"
import type { CategoryInfo } from "@/lib/contract-types"
import type {
  QuestDiscoveryStatus,
  QuestPresetFilter,
  QuestSortOrder,
  QuestScopeFilter,
  TagFilterMode,
} from "@/hooks/use-dashboard-filters"

export interface FilterPanelProps {
  // scope
  filter: QuestScopeFilter
  onFilterChange: (value: QuestScopeFilter) => void
  connected: boolean
  // search + dropdowns
  search: string
  onSearchChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  availableCategories: string[]
  creatorFilter: string
  onCreatorFilterChange: (value: string) => void
  availableCreators: string[]
  address?: string
  rewardTokenFilter: string
  onRewardTokenFilterChange: (value: string) => void
  availableRewardTokens: string[]
  sortBy: QuestSortOrder
  onSortByChange: (value: QuestSortOrder) => void
  // tags
  tagInput: string
  onTagInputChange: (value: string) => void
  onTagCommit: (tag: string) => void
  selectedTags: string[]
  onSelectedTagsChange: (tags: string[]) => void
  tagSuggestions: string[]
  tagFilterMode: TagFilterMode
  onTagFilterModeChange: (mode: TagFilterMode) => void
  // discovery
  categoryInfo: CategoryInfo | null
  symbol: string
  statusFilter: QuestDiscoveryStatus
  onStatusFilterChange: (value: QuestDiscoveryStatus) => void
  rewardMin: string
  onRewardMinChange: (value: string) => void
  rewardMax: string
  onRewardMaxChange: (value: string) => void
  onClearRewardRange: () => void
  preset: QuestPresetFilter
  onPresetChange: (value: QuestPresetFilter) => void
}

const scopeButtonClassName = (active: boolean) =>
  `border-border cursor-pointer border-r px-4 py-2 text-xs font-semibold tracking-wider capitalize uppercase transition-colors last:border-r-0 ${
    active ? "bg-accent" : "bg-background hover:bg-secondary"
  }`

/**
 * All quest-discovery controls for the dashboard, in the order they are rendered:
 * scope tabs, search/dropdowns, tag filter, then status/reward/preset chips.
 */
export function FilterPanel(props: FilterPanelProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="relative mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <LayoutDashboard className="h-5 w-5" />{" "}
          {props.connected ? t("dashboard.yourQuests") : t("dashboard.publicQuests")}
        </h2>
        {props.connected && (
          <div
            className="border-border flex gap-0 border shadow-md"
            role="group"
            aria-label={t("dashboard.questFilter")}
          >
            {(["all", "owned", "enrolled"] as const).map(f => (
              <button
                key={f}
                onClick={() => props.onFilterChange(f)}
                aria-pressed={props.filter === f}
                className={scopeButtonClassName(props.filter === f)}
              >
                {f === "all"
                  ? t("dashboard.showAll")
                  : f === "owned"
                    ? t("dashboard.showOwned")
                    : t("dashboard.showEnrolled")}
              </button>
            ))}
          </div>
        )}
      </div>

      <SearchFilter
        search={props.search}
        onSearchChange={props.onSearchChange}
        category={props.category}
        onCategoryChange={props.onCategoryChange}
        availableCategories={props.availableCategories}
        creatorFilter={props.creatorFilter}
        onCreatorFilterChange={props.onCreatorFilterChange}
        availableCreators={props.availableCreators}
        address={props.address}
        rewardTokenFilter={props.rewardTokenFilter}
        onRewardTokenFilterChange={props.onRewardTokenFilterChange}
        availableRewardTokens={props.availableRewardTokens}
        sortBy={props.sortBy}
        onSortByChange={props.onSortByChange}
      />

      <TagFilter
        tagInput={props.tagInput}
        onTagInputChange={props.onTagInputChange}
        onTagCommit={props.onTagCommit}
        selectedTags={props.selectedTags}
        onSelectedTagsChange={props.onSelectedTagsChange}
        tagSuggestions={props.tagSuggestions}
        tagFilterMode={props.tagFilterMode}
        onTagFilterModeChange={props.onTagFilterModeChange}
      />

      <DiscoveryFilters
        categoryInfo={props.categoryInfo}
        symbol={props.symbol}
        statusFilter={props.statusFilter}
        onStatusFilterChange={props.onStatusFilterChange}
        rewardMin={props.rewardMin}
        onRewardMinChange={props.onRewardMinChange}
        rewardMax={props.rewardMax}
        onRewardMaxChange={props.onRewardMaxChange}
        onClearRewardRange={props.onClearRewardRange}
        preset={props.preset}
        onPresetChange={props.onPresetChange}
      />
    </div>
  )
}
