import { Search, X } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { QuestSortOrder } from "@/hooks/use-dashboard-filters"

export interface SearchFilterProps {
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
}

const selectClassName =
  "border-border bg-background cursor-pointer border px-3 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-sm focus:outline-none"

export function SearchFilter({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  availableCategories,
  creatorFilter,
  onCreatorFilterChange,
  availableCreators,
  address,
  rewardTokenFilter,
  onRewardTokenFilterChange,
  availableRewardTokens,
  sortBy,
  onSortByChange,
}: SearchFilterProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
          aria-label={t("dashboard.searchLabel")}
          className="border-border bg-background w-full border py-2.5 pr-9 pl-9 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label={t("dashboard.clearSearch")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <select
        value={category}
        onChange={e => onCategoryChange(e.target.value)}
        aria-label={t("dashboard.filterCategory")}
        className={selectClassName}
      >
        <option value="all">{t("dashboard.allCategories")}</option>
        {availableCategories.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={creatorFilter}
        onChange={e => onCreatorFilterChange(e.target.value)}
        aria-label={t("dashboard.filterCreator")}
        className={selectClassName}
      >
        <option value="all">{t("dashboard.allCreators")}</option>
        {availableCreators.map(creator => (
          <option key={creator} value={creator}>
            {creator === address ? t("dashboard.you") : `${creator.slice(0, 6)}...${creator.slice(-4)}`}
          </option>
        ))}
      </select>

      <select
        value={rewardTokenFilter}
        onChange={e => onRewardTokenFilterChange(e.target.value)}
        aria-label={t("dashboard.filterToken")}
        className={selectClassName}
      >
        <option value="all">{t("dashboard.allTokens")}</option>
        {availableRewardTokens.map(token => (
          <option key={token} value={token}>
            {`${token.slice(0, 6)}...${token.slice(-4)}`}
          </option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={e => onSortByChange(e.target.value as QuestSortOrder)}
        aria-label={t("dashboard.sortQuests")}
        className={selectClassName}
      >
        <option value="newest">{t("dashboard.sort.newest")}</option>
        <option value="ending-soon">{t("dashboard.sort.endingSoon")}</option>
        <option value="most-enrolled">{t("dashboard.sort.mostEnrolled")}</option>
        <option value="highest-reward">{t("dashboard.sort.highestReward")}</option>
      </select>
    </div>
  )
}
