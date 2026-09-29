import { SlidersHorizontal, X } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { CategoryInfo } from "@/lib/contract-types"
import type {
  QuestDiscoveryStatus,
  QuestPresetFilter,
} from "@/hooks/use-dashboard-filters"

export interface DiscoveryFiltersProps {
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

const chipClassName = (active: boolean) =>
  `border-border border px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
    active ? "bg-accent" : "bg-background hover:bg-secondary hover:shadow-md"
  }`

/**
 * Status, reward-range, and preset chips plus the category-expiry notice. Rendered
 * as one block so the ordering of the discovery controls stays in a single place.
 */
export function DiscoveryFilters({
  categoryInfo,
  symbol,
  statusFilter,
  onStatusFilterChange,
  rewardMin,
  onRewardMinChange,
  rewardMax,
  onRewardMaxChange,
  onClearRewardRange,
  preset,
  onPresetChange,
}: DiscoveryFiltersProps) {
  const { t } = useTranslation()

  return (
    <>
      {categoryInfo && (
        <p
          className={`text-xs font-bold ${
            categoryInfo.expiresAt * 1000 - Date.now() < 7 * 24 * 60 * 60 * 1000
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {categoryInfo.expiresAt * 1000 - Date.now() < 7 * 24 * 60 * 60 * 1000
            ? t("dashboard.expiringSoon")
            : t("dashboard.availableUntil")}
          {new Date(categoryInfo.expiresAt * 1000).toLocaleDateString()}
        </p>
      )}

      {/* Status filter chips */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("dashboard.filterStatus")}>
        {(
          [
            { value: "all", label: t("dashboard.status.all") },
            { value: "active", label: t("dashboard.status.active") },
            { value: "completed", label: t("dashboard.status.completed") },
          ] as const
        ).map(s => (
          <button
            key={s.value}
            onClick={() => onStatusFilterChange(s.value)}
            aria-pressed={statusFilter === s.value}
            className={chipClassName(statusFilter === s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Reward range filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-xs font-bold uppercase">
            {t("dashboard.rewardRange")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={rewardMin}
            onChange={e => onRewardMinChange(e.target.value)}
            placeholder={t("dashboard.minReward", { symbol })}
            aria-label={t("dashboard.minRewardLabel")}
            min="0"
            className="border-border bg-background w-28 border px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none"
          />
          <span className="text-muted-foreground text-xs">-</span>
          <input
            type="number"
            value={rewardMax}
            onChange={e => onRewardMaxChange(e.target.value)}
            placeholder={t("dashboard.maxReward", { symbol })}
            aria-label={t("dashboard.maxRewardLabel")}
            min="0"
            className="border-border bg-background w-28 border px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none"
          />
          {(rewardMin !== "" || rewardMax !== "") && (
            <button
              type="button"
              onClick={onClearRewardRange}
              aria-label={t("dashboard.clearRewardRange")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Preset Filter Chips */}
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label={t("dashboard.presetFilters")}
      >
        {(
          [
            { value: "none", label: t("dashboard.showAll") },
            { value: "ending-soon", label: t("dashboard.preset.endingSoon") },
            { value: "recently-funded", label: t("dashboard.preset.recentlyFunded") },
            { value: "recently-verified", label: t("dashboard.preset.recentlyVerified") },
          ] as const
        ).map(p => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            aria-pressed={preset === p.value}
            className={chipClassName(preset === p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </>
  )
}
