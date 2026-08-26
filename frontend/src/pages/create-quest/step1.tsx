import { useState, type KeyboardEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, FileText, LayoutTemplate, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { step1Schema, type Step1Values, FieldError, FormLabel } from "./types"
import { useQuestCreation } from "./context"
import { TemplatePicker } from "./template-picker"
import { templateToStep1, templateToMilestones, type QuestTemplate } from "./quest-templates"

export function Step1Form() {
  const { step1Data, setStep1Data, setStep2Data, goToNext } = useQuestCreation()
  const [tagInput, setTagInput] = useState("")
  const [tagError, setTagError] = useState<string | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [appliedTemplate, setAppliedTemplate] = useState<QuestTemplate | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<Step1Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(step1Schema as any),
    defaultValues: {
      name: step1Data.name || "",
      description: step1Data.description || "",
      category: step1Data.category || "",
      tags: step1Data.tags || [],
    },
    mode: "onChange",
  })

  const handleApplyTemplate = (template: QuestTemplate) => {
    const s1 = templateToStep1(template)
    const milestones = templateToMilestones(template)
    // Pre-fill the react-hook-form state so the inputs show values immediately
    reset(s1)
    // Persist to context so step2 and step3 can access the data
    setStep1Data(s1)
    setStep2Data({ milestones })
    setAppliedTemplate(template)
    setIsPickerOpen(false)
  }

  const nameValue = watch("name", "")
  const descValue = watch("description", "")
  const categoryValue = watch("category", "")
  const tagsValue = watch("tags", [])

  const handleAddTag = () => {
    setTagError(null)
    const trimmed = tagInput.trim()
    if (!trimmed) {
      setTagError("Tag cannot be empty")
      return
    }
    if (trimmed.length > 32) {
      setTagError("Tag max 32 characters")
      return
    }
    if (tagsValue.length >= 5) {
      setTagError("Maximum 5 tags allowed")
      return
    }
    if (tagsValue.includes(trimmed)) {
      setTagError("Tag already added")
      return
    }

    const updated = [...tagsValue, trimmed]
    setValue("tags", updated, { shouldValidate: true, shouldDirty: true })
    setTagInput("")
  }

  const handleRemoveTag = (indexToRemove: number) => {
    const updated = tagsValue.filter((_, idx) => idx !== indexToRemove)
    setValue("tags", updated, { shouldValidate: true, shouldDirty: true })
    setTagError(null)
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const onSubmit = (data: Step1Values) => {
    setStep1Data(data)
    goToNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <div className="bg-accent border-border border-b px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wider uppercase">
                Step 1 — Quest Basics
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="border-border bg-background hover:bg-secondary neo-press flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold transition-colors"
              data-testid="open-template-picker"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Load a Template
            </button>
          </div>
          {/* Applied template badge */}
          {appliedTemplate && (
            <div
              className="mt-3 flex items-center justify-between gap-2 rounded-sm border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-800"
              data-testid="applied-template-badge"
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />
                Template applied: {appliedTemplate.name}
              </div>
              <button
                type="button"
                onClick={() => setAppliedTemplate(null)}
                aria-label="Dismiss template badge"
                className="shrink-0 cursor-pointer opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="border-border bg-background space-y-5 border border-t-0 p-6 shadow-md">
          {/* Name */}
          <div>
            <FormLabel htmlFor="quest-name-input" required>
              Quest Name
            </FormLabel>
            <input
              id="quest-name-input"
              {...register("name")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "quest-name-error" : undefined}
              placeholder="e.g. Learn to Code with Alex"
              className={cn(
                "border-border bg-background w-full border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.name && "border-destructive focus:ring-destructive focus:ring-1"
              )}
              maxLength={64}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError id="quest-name-error" message={errors.name?.message} />
              <span
                className={cn(
                  "ml-auto text-xs font-bold",
                  nameValue.length > 56 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {nameValue.length}/64
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <FormLabel htmlFor="quest-description-input" required>
              Description
            </FormLabel>
            <textarea
              id="quest-description-input"
              {...register("description")}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "quest-description-error" : undefined}
              rows={5}
              placeholder="Describe what learners will accomplish..."
              className={cn(
                "border-border bg-background w-full resize-none border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.description && "border-destructive focus:ring-destructive focus:ring-1"
              )}
              maxLength={2000}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError id="quest-description-error" message={errors.description?.message} />
              <span
                className={cn(
                  "ml-auto text-xs font-bold",
                  descValue.length > 1800 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {descValue.length}/2000
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <FormLabel htmlFor="quest-category-input" required>
              Category
            </FormLabel>
            <input
              id="quest-category-input"
              {...register("category")}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? "quest-category-error" : undefined}
              placeholder="e.g. Programming, Web3, Design"
              className={cn(
                "border-border bg-background w-full border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.category && "border-destructive focus:ring-destructive focus:ring-1"
              )}
              maxLength={32}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError id="quest-category-error" message={errors.category?.message} />
              <span
                className={cn(
                  "ml-auto text-xs font-bold",
                  categoryValue.length > 28 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {categoryValue.length}/32
              </span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <FormLabel htmlFor="quest-tag-input">Tags (Optional, Max 5)</FormLabel>
            <div className="flex gap-2">
              <input
                id="quest-tag-input"
                type="text"
                value={tagInput}
                onChange={e => {
                  setTagInput(e.target.value)
                  if (tagError) setTagError(null)
                }}
                onKeyDown={handleTagKeyDown}
                placeholder="e.g. soroban, rust"
                disabled={tagsValue.length >= 5}
                aria-invalid={!!tagError || !!errors.tags}
                aria-describedby={tagError ? "quest-tag-error" : undefined}
                className={cn(
                  "border-border bg-background flex-1 border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none disabled:opacity-50",
                  (tagError || errors.tags) && "border-destructive"
                )}
                maxLength={32}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={tagsValue.length >= 5 || !tagInput.trim()}
                className="neo-press border-border border"
              >
                <Plus className="h-4 w-4" />
                Add Tag
              </Button>
            </div>
            <div className="mt-1">
              <FieldError
                id="quest-tag-error"
                message={tagError || (errors.tags?.message as string)}
              />
            </div>

            {/* Tag Pills */}
            {tagsValue.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tagsValue.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-accent border-border text-foreground flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      aria-label={`Remove tag ${tag}`}
                      className="hover:text-destructive cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="shimmer-on-hover" disabled={!isValid}>
          Next: Add Milestones
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <TemplatePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onApply={handleApplyTemplate}
      />
    </form>
  )
}
