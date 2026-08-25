/**
 * TemplatePicker — full-screen modal to browse and preview quest templates.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────┐
 *   │  Header: title + close button                   │
 *   ├──────────────┬──────────────────────────────────┤
 *   │  Left panel  │  Right panel                     │
 *   │  Category    │  Preview: name, tagline, milest. │
 *   │  tabs +      │  + "Use this template" CTA       │
 *   │  template    │                                  │
 *   │  cards       │  (or empty state when nothing    │
 *   │              │   is selected)                   │
 *   └──────────────┴──────────────────────────────────┘
 *
 * On mobile the layout collapses to a single-column flow:
 *   category tabs → cards → tapping a card expands inline preview.
 */

import { useState, useEffect, useCallback } from "react"
import { X, ArrowRight, Coins, Check, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  QUEST_TEMPLATES,
  TEMPLATES_BY_CATEGORY,
  CATEGORY_META,
  type QuestTemplate,
  type TemplateCategory,
} from "./quest-templates"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplatePickerProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the user closes without selecting */
  onClose: () => void
  /** Called when the user confirms a template selection */
  onApply: (template: QuestTemplate) => void
}

// ─── TemplateCard (left panel item) ──────────────────────────────────────────

interface TemplateCardProps {
  template: QuestTemplate
  isSelected: boolean
  onSelect: () => void
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`Select template: ${template.name}`}
      className={cn(
        "border-border bg-background w-full cursor-pointer border p-4 text-left transition-all",
        "hover:bg-secondary focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        isSelected
          ? "border-foreground bg-accent shadow-[2px_2px_0px_0px_hsl(var(--foreground))]"
          : "hover:shadow-[2px_2px_0px_0px_hsl(var(--border))]"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0 text-xl" aria-hidden>
          {template.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{template.name}</p>
            {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" aria-label="Selected" />}
          </div>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{template.tagline}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="bg-secondary border-border border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              {template.duration}
            </span>
            <span className="text-muted-foreground text-[10px] font-semibold">
              {template.step2.milestones.length} milestones
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── MobilePreviewPanel (collapsible, shown below selected card on mobile) ───

interface MobilePreviewPanelProps {
  template: QuestTemplate
  onApply: () => void
}

function MobilePreviewPanel({ template, onApply }: MobilePreviewPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const totalReward = template.step2.milestones.reduce((s, m) => s + m.rewardAmount, 0)

  return (
    <div className="border-border bg-accent border-t">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
        aria-expanded={expanded}
      >
        <span>Preview: {template.name}</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="space-y-4 px-4 pb-4">
          <PreviewContent template={template} totalReward={totalReward} />
          <Button onClick={onApply} className="shimmer-on-hover w-full">
            Start with this template
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── PreviewContent (shared by desktop panel and mobile panel) ───────────────

interface PreviewContentProps {
  template: QuestTemplate
  totalReward: number
}

function PreviewContent({ template, totalReward }: PreviewContentProps) {
  return (
    <>
      {/* Category + duration badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {CATEGORY_META[template.category].icon} {CATEGORY_META[template.category].label}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {template.duration}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          <Coins className="mr-1 h-3 w-3" />
          {totalReward} USDC suggested
        </Badge>
      </div>

      {/* Quest basics */}
      <div>
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
          Quest Basics
        </p>
        <h3 className="text-base font-semibold">{template.step1.name}</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {template.step1.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="bg-secondary border-border border px-2 py-0.5 text-[10px] font-semibold">
            {template.step1.category}
          </span>
          {template.step1.tags.map(tag => (
            <span
              key={tag}
              className="bg-secondary border-border border px-2 py-0.5 text-[10px] font-semibold"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
          Milestones ({template.step2.milestones.length})
        </p>
        <ol className="space-y-2">
          {template.step2.milestones.map((m, i) => (
            <li key={i} className="bg-background border-border flex items-start gap-3 border p-3">
              <div className="bg-accent border-border mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border text-[10px] font-semibold">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{m.title}</p>
                  <span className="flex-shrink-0 text-xs font-semibold tabular-nums">
                    {m.rewardAmount} USDC
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {m.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Total */}
      <div className="bg-secondary border-border flex items-center justify-between border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Suggested total reward</span>
        </div>
        <span className="text-sm font-semibold tabular-nums">{totalReward} USDC</span>
      </div>
    </>
  )
}

// ─── TemplatePicker (main) ────────────────────────────────────────────────────

const CATEGORIES: TemplateCategory[] = ["course", "bootcamp", "challenge"]

export function TemplatePicker({ isOpen, onClose, onApply }: TemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("course")
  const [selectedId, setSelectedId] = useState<string | null>(QUEST_TEMPLATES[0]?.id ?? null)

  // Reset to first template in the newly selected category
  const handleCategoryChange = useCallback((cat: TemplateCategory) => {
    setActiveCategory(cat)
    setSelectedId(TEMPLATES_BY_CATEGORY[cat][0]?.id ?? null)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const visibleTemplates = TEMPLATES_BY_CATEGORY[activeCategory]
  const selectedTemplate = selectedId
    ? (QUEST_TEMPLATES.find(t => t.id === selectedId) ?? null)
    : null
  const totalReward = selectedTemplate
    ? selectedTemplate.step2.milestones.reduce((s, m) => s + m.rewardAmount, 0)
    : 0

  const handleApply = () => {
    if (selectedTemplate) {
      onApply(selectedTemplate)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a quest template"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Modal container */}
      <div className="bg-background border-border relative mx-auto flex w-full max-w-5xl flex-col overflow-hidden border shadow-2xl sm:my-4 sm:rounded-none">
        {/* ── Header ────────────────────────────────────── */}
        <div className="bg-accent border-border flex flex-shrink-0 items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase">
              Choose a Quest Template
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Start with a pre-built structure. You can edit every field before creating.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close template picker"
            className="border-border bg-background neo-press hover:bg-secondary flex h-8 w-8 cursor-pointer items-center justify-center border transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Category Tabs ──────────────────────────────── */}
        <div
          className="border-border flex flex-shrink-0 gap-0 border-b"
          role="tablist"
          aria-label="Template categories"
        >
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat]
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${cat}`}
                id={`tab-${cat}`}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "border-border flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-r px-3 py-3 text-xs font-semibold transition-colors last:border-r-0 sm:gap-2 sm:px-5 sm:text-sm",
                  isActive
                    ? "bg-background text-foreground border-b-foreground border-b-2"
                    : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span aria-hidden>{meta.icon}</span>
                <span className="hidden sm:inline">{meta.label}</span>
                <span className="sm:hidden">{meta.label}</span>
                <span className="bg-accent border-border hidden border px-1 text-[10px] font-semibold sm:inline">
                  {TEMPLATES_BY_CATEGORY[cat].length}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Body: two-panel layout on md+, single column on mobile ── */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* ── Left: Template List ─────────────────────── */}
          <div
            id={`tabpanel-${activeCategory}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeCategory}`}
            className="border-border flex w-full flex-col overflow-y-auto border-r md:w-72 md:flex-shrink-0 lg:w-80"
          >
            <div className="flex-shrink-0 px-4 pt-3 pb-1">
              <p className="text-muted-foreground text-xs leading-relaxed">
                {CATEGORY_META[activeCategory].description}
              </p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {visibleTemplates.map(template => (
                <div key={template.id}>
                  <TemplateCard
                    template={template}
                    isSelected={selectedId === template.id}
                    onSelect={() => setSelectedId(template.id)}
                  />
                  {/* Mobile-only inline preview */}
                  {selectedId === template.id && (
                    <div className="md:hidden">
                      <MobilePreviewPanel template={template} onApply={handleApply} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Preview Panel (desktop only) ─────── */}
          <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
            {selectedTemplate ? (
              <>
                {/* Scrollable preview content */}
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl" aria-hidden>
                      {selectedTemplate.icon}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                      <p className="text-muted-foreground text-sm">{selectedTemplate.tagline}</p>
                    </div>
                  </div>
                  <PreviewContent template={selectedTemplate} totalReward={totalReward} />
                </div>

                {/* Sticky footer CTA */}
                <div className="border-border flex-shrink-0 border-t p-4">
                  <Button onClick={handleApply} className="shimmer-on-hover w-full" size="lg">
                    Start with this template
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-muted-foreground mt-2 text-center text-xs">
                    All fields are editable before you create the quest.
                  </p>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <span className="text-4xl" aria-hidden>
                  👈
                </span>
                <p className="text-sm font-semibold">Select a template to preview it here</p>
                <p className="text-muted-foreground max-w-xs text-xs">
                  Browse the templates on the left and click one to see its full milestone
                  structure.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile footer: apply button when something is selected ── */}
        {selectedTemplate && (
          <div className="border-border flex-shrink-0 border-t p-4 md:hidden">
            <Button onClick={handleApply} className="shimmer-on-hover w-full">
              Start with "{selectedTemplate.name}"
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
