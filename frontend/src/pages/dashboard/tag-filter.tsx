import { X } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { TagFilterMode } from "@/hooks/use-dashboard-filters"

export interface TagFilterProps {
  tagInput: string
  onTagInputChange: (value: string) => void
  onTagCommit: (tag: string) => void
  selectedTags: string[]
  onSelectedTagsChange: (tags: string[]) => void
  tagSuggestions: string[]
  tagFilterMode: TagFilterMode
  onTagFilterModeChange: (mode: TagFilterMode) => void
}

/** Tag search with autocomplete and multi-tag AND/OR matching (issue #1635). */
export function TagFilter({
  tagInput,
  onTagInputChange,
  onTagCommit,
  selectedTags,
  onSelectedTagsChange,
  tagSuggestions,
  tagFilterMode,
  onTagFilterModeChange,
}: TagFilterProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-4">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={tagInput}
            onChange={e => onTagInputChange(e.target.value)}
            onKeyDown={e => {
              if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                e.preventDefault()
                onTagCommit(tagInput.trim().replace(/,$/, ""))
              }
            }}
            placeholder={t("dashboard.tagFilterPlaceholder")}
            aria-label={t("dashboard.tagFilterLabel")}
            aria-autocomplete="list"
            aria-controls="tag-suggestions"
            className="border-border bg-background w-full border py-2 pr-3 pl-3 text-sm font-medium focus:outline-none"
          />
          {tagSuggestions.length > 0 && (
            <ul
              id="tag-suggestions"
              role="listbox"
              aria-label={t("dashboard.tagSuggestions")}
              className="border-border bg-background absolute top-full left-0 z-20 mt-0.5 w-full border shadow-lg"
            >
              {tagSuggestions.slice(0, 8).map(tag => (
                <li key={tag} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="hover:bg-accent w-full px-3 py-1.5 text-left text-xs font-medium"
                    onMouseDown={e => {
                      e.preventDefault()
                      onTagCommit(tag)
                    }}
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* AND / OR toggle */}
        {selectedTags.length > 1 && (
          <div
            className="border-border flex border shadow-sm"
            role="group"
            aria-label={t("dashboard.tagFilterMode")}
          >
            {(["OR", "AND"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onTagFilterModeChange(m)}
                aria-pressed={tagFilterMode === m}
                className={`px-3 py-2 text-xs font-bold transition-colors ${
                  tagFilterMode === m ? "bg-accent" : "bg-background hover:bg-secondary"
                }`}
              >
                {m === "OR" ? t("dashboard.tagModeOr") : t("dashboard.tagModeAnd")}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Active tag chips */}
      {selectedTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={t("dashboard.activeTagFilters")}>
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="bg-accent border-border flex items-center gap-1 border px-2 py-0.5 text-xs font-bold"
            >
              {tag}
              <button
                type="button"
                onClick={() => onSelectedTagsChange(selectedTags.filter(x => x !== tag))}
                aria-label={t("create.removeTag", { tag })}
                className="hover:text-destructive ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onSelectedTagsChange([])}
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            {t("dashboard.clearAllTags")}
          </button>
        </div>
      )}
    </div>
  )
}
