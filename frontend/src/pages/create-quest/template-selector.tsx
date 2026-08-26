import { Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { QUEST_TEMPLATES, type TemplateId } from "./templates"

interface TemplateSelectorProps {
  selectedTemplateId: TemplateId | null
  onSelect: (templateId: TemplateId) => void
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  return (
    <section aria-labelledby="template-heading" className="relative mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        <h2 id="template-heading" className="text-sm font-semibold tracking-wider uppercase">
          Start with a template
        </h2>
        <span className="text-muted-foreground text-xs font-medium">(optional)</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {QUEST_TEMPLATES.map(template => {
          const Icon = template.icon
          const selected = selectedTemplateId === template.id
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(template.id)}
              className={cn(
                "border-border bg-background hover:bg-accent flex cursor-pointer flex-col items-start gap-3 border p-4 text-left shadow-sm transition-colors",
                selected && "bg-accent border-foreground shadow-md"
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span className="bg-accent border-border flex h-9 w-9 items-center justify-center border">
                  <Icon className="h-4 w-4" />
                </span>
                {selected && <Check className="h-4 w-4" aria-label="Selected" />}
              </span>
              <span>
                <span className="block text-sm font-semibold">{template.name}</span>
                <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                  {template.shortDescription}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Templates prefill your quest details and milestones. Everything remains editable.
      </p>
    </section>
  )
}
