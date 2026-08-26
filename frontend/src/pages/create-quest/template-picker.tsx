/**
 * TemplatePicker — modal that lets the user browse and apply pre-built quest
 * templates before filling in the create-quest wizard manually.
 *
 * Behaviour:
 *  - Shows a category filter row (All / Course / Bootcamp / Skill Challenge)
 *  - Renders a card grid; each card shows icon, name, category pill,
 *    description, milestone count, and total reward estimate
 *  - Clicking "Use Template" calls onApply with the selected QuestTemplate
 *  - Accessible: focus-trapped, Escape closes, backdrop click closes
 */

import { useEffect, useRef, useState } from "react"
import {
  BarChart2,
  Brain,
  ChevronRight,
  Code,
  Code2,
  Cpu,
  GitMerge,
  Layers,
  Palette,
  Server,
  Shield,
  ShieldAlert,
  X,
  Zap,
  LayoutTemplate,
  Coins,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import {
  QUEST_TEMPLATES,
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
  templateTotalReward,
  type QuestTemplate,
  type TemplateCategory,
} from "./quest-templates"
import { formatTokens } from "@/lib/utils"

/**
 * Template reward amounts are stored as whole-token values (e.g. 50 = $50 USDC).
 * formatTokens() divides by 10^decimals, so we pass decimals=0 to display the
 * value as-is without any scaling.
 */
function formatTemplateReward(amount: number): string {
  return formatTokens(amount, 0, "USDC")
}

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart2,
  Brain,
  Code,
  Code2,
  Cpu,
  GitMerge,
  Layers,
  Palette,
  Server,
  Shield,
  ShieldAlert,
  Zap,
}

function TemplateIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Code
  return <Icon className={className} />
}

// ─── Category pill colours ────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<TemplateCategory, string> = {
  course: "bg-blue-100 text-blue-800 border-blue-300",
  bootcamp: "bg-yellow-100 text-yellow-800 border-yellow-300",
  "skill-challenge": "bg-green-100 text-green-800 border-green-300",
}

// ─── Template card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: QuestTemplate
  isSelected: boolean
  onSelect: (t: QuestTemplate) => void
  onApply: (t: QuestTemplate) => void
}

function TemplateCard({ template, isSelected, onSelect, onApply }: TemplateCardProps) {
  const total = templateTotalReward(template)

  return (
    <div
      className={cn(
        "border-border bg-background flex cursor-pointer flex-col border shadow-sm transition-all hover:shadow-md",
        isSelected && "ring-foreground shadow-md ring-2"
      )}
      data-testid="template-card"
      onClick={() => onSelect(template)}
    >
      {/* Card header */}
      <div className="bg-accent border-border flex items-center gap-3 border-b px-4 py-3">
        <div className="border-border bg-background flex h-8 w-8 shrink-0 items-center justify-center border shadow-sm">
          <TemplateIcon name={template.icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">{template.name}</p>
          <span
            className={cn(
              "mt-0.5 inline-block border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
              CATEGORY_STYLES[template.category]
            )}
          >
            {CATEGORY_LABELS[template.category]} · {template.categoryLabel}
          </span>
        </div>
        {isSelected && (
          <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0 rotate-90 transition-transform sm:rotate-0" />
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
          {template.description}
        </p>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="border-border flex items-center gap-4 border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Target className="text-muted-foreground h-3.5 w-3.5" />
            <span>{template.milestones.length} milestones</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Coins className="text-muted-foreground h-3.5 w-3.5" />
            <span>{formatTemplateReward(total)} suggested</span>
          </div>
        </div>
      </div>

      {/* Apply button */}
      <div className="border-border border-t p-4 pt-3">
        <Button
          size="sm"
          className="shimmer-on-hover w-full"
          onClick={e => {
            e.stopPropagation()
            onApply(template)
          }}
          data-testid={`apply-template-${template.id}`}
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          Load Template
        </Button>
      </div>
    </div>
  )
}

// ─── Preview panel ────────────────────────────────────────────────────────────

interface PreviewPanelProps {
  template: QuestTemplate
  onApply: (t: QuestTemplate) => void
}

function PreviewPanel({ template, onApply }: PreviewPanelProps) {
  const total = templateTotalReward(template)
  return (
    <div
      className="border-border bg-background flex flex-col border shadow-md"
      data-testid="template-preview-panel"
    >
      {/* Panel header */}
      <div className="bg-accent border-border flex items-center gap-3 border-b px-5 py-4">
        <div className="border-border bg-background flex h-9 w-9 shrink-0 items-center justify-center border shadow-sm">
          <TemplateIcon name={template.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-semibold">{template.name}</p>
          <span
            className={cn(
              "mt-0.5 inline-block border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
              CATEGORY_STYLES[template.category]
            )}
          >
            {CATEGORY_LABELS[template.category]} · {template.categoryLabel}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="border-border border-b px-5 py-4">
        <p className="text-muted-foreground text-xs leading-relaxed">{template.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Milestones list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-wider uppercase">
          Milestones ({template.milestones.length})
        </p>
        <ol className="space-y-3">
          {template.milestones.map((m, i) => (
            <li key={i} className="flex gap-3">
              <div className="border-border bg-accent flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-bold">
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="text-xs leading-snug font-semibold">{m.title}</p>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-relaxed">
                  {m.description}
                </p>
                <p className="text-muted-foreground mt-1 text-[10px] font-semibold">
                  {formatTemplateReward(m.rewardAmount)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Footer */}
      <div className="border-border border-t px-5 py-4">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Total suggested reward</span>
          <span>{formatTemplateReward(total)}</span>
        </div>
        <Button
          size="sm"
          className="shimmer-on-hover w-full"
          onClick={() => onApply(template)}
          data-testid={`preview-apply-template-${template.id}`}
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          Load This Template
        </Button>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface TemplatePickerProps {
  isOpen: boolean
  onClose: () => void
  onApply: (template: QuestTemplate) => void
}

type CategoryFilter = "all" | TemplateCategory

export function TemplatePicker({ isOpen, onClose, onApply }: TemplatePickerProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all")
  const [selectedTemplate, setSelectedTemplate] = useState<QuestTemplate | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useScrollLock(isOpen)

  // Reset state when dialog re-opens
  useEffect(() => {
    if (isOpen) {
      // Defer state resets so they don't run synchronously inside the effect
      // body (avoids react-hooks/set-state-in-effect lint rule).
      const resetTimer = setTimeout(() => {
        setActiveFilter("all")
        setSelectedTemplate(null)
      }, 0)

      previousFocusRef.current = document.activeElement as HTMLElement

      const focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose()
          return
        }
        if (e.key === "Tab" && dialogRef.current) {
          const focusable = Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          )
          if (focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus()
              e.preventDefault()
            }
          } else {
            if (document.activeElement === last) {
              first.focus()
              e.preventDefault()
            }
          }
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => {
        clearTimeout(resetTimer)
        clearTimeout(focusTimer)
        window.removeEventListener("keydown", handleKeyDown)
        previousFocusRef.current?.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filtered =
    activeFilter === "all"
      ? QUEST_TEMPLATES
      : QUEST_TEMPLATES.filter(t => t.category === activeFilter)

  const filterButtons: { value: CategoryFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...TEMPLATE_CATEGORIES.map(c => ({ value: c as CategoryFilter, label: CATEGORY_LABELS[c] })),
  ]

  const handleSelect = (t: QuestTemplate) => {
    setSelectedTemplate(prev => (prev?.id === t.id ? null : t))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        className="animate-fade-in-up relative z-10 mx-4 w-full max-w-5xl"
      >
        <div className="border-border bg-background border shadow-xl">
          {/* Header */}
          <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              <span
                id="template-picker-title"
                className="text-sm font-semibold tracking-wider uppercase"
              >
                Choose a Template
              </span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close template picker"
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border-2 shadow-sm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Category filter */}
          <div className="border-border flex items-center gap-2 overflow-x-auto border-b px-6 py-3">
            {filterButtons.map(btn => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setActiveFilter(btn.value)}
                aria-pressed={activeFilter === btn.value}
                className={cn(
                  "border-border shrink-0 cursor-pointer border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
                  activeFilter === btn.value
                    ? "bg-foreground text-background"
                    : "bg-background hover:bg-secondary"
                )}
              >
                {btn.label}
                {btn.value !== "all" && (
                  <span className="text-muted-foreground ml-1.5 font-normal">
                    ({QUEST_TEMPLATES.filter(t => t.category === btn.value).length})
                  </span>
                )}
              </button>
            ))}
            <span className="text-muted-foreground ml-auto shrink-0 text-xs">
              {filtered.length} template{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Content: split layout when a template is selected */}
          <div className="flex max-h-[65vh] min-h-0">
            {/* Template grid (scrollable) */}
            <div
              className={cn("overflow-y-auto p-6", selectedTemplate ? "w-full lg:w-3/5" : "w-full")}
            >
              {filtered.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  No templates in this category yet.
                </p>
              ) : (
                <div
                  className={cn(
                    "grid gap-4",
                    selectedTemplate
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  )}
                  data-testid="template-grid"
                >
                  {filtered.map(t => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      isSelected={selectedTemplate?.id === t.id}
                      onSelect={handleSelect}
                      onApply={onApply}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Preview panel (visible only on larger screens when a template is selected) */}
            {selectedTemplate && (
              <div className="border-border hidden overflow-y-auto border-l lg:block lg:w-2/5">
                <PreviewPanel template={selectedTemplate} onApply={onApply} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-border bg-accent/40 flex items-center justify-between border-t px-6 py-3">
            <p className="text-muted-foreground text-xs">
              {selectedTemplate
                ? `Previewing: ${selectedTemplate.name}`
                : "Click a template to preview its milestones, then use it to pre-fill the form."}
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
