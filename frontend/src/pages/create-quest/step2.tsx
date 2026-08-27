import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Coins,
  Target,
  FileSpreadsheet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTokens, cn } from "@/lib/utils"
import { MAX_MILESTONE_TITLE_LEN, MAX_MILESTONE_DESCRIPTION_LEN } from "@/lib/contract-types"
import { step2Schema, milestoneSchema, type Step2Values, FieldError, FormLabel } from "./types"
import { useQuestCreation } from "./context"
import { CsvImportDialog } from "./csv-import-dialog"
import type { ParsedMilestone } from "./csv-parser"

export function Step2Form() {
  const { step2Data, setStep2Data, goToNext, goToBack } = useQuestCreation()
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<Step2Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(step2Schema as any),
    defaultValues: step2Data,
    mode: "onChange",
  })

  const { fields, append, remove, swap, replace } = useFieldArray({
    control,
    name: "milestones",
  })

  const handleBatchImport = (imported: ParsedMilestone[], mode: "append" | "replace") => {
    if (mode === "replace") {
      replace(imported.map(item => ({ ...item, prerequisiteIds: [] })))
    } else {
      append(imported.map(item => ({ ...item, prerequisiteIds: [] })))
    }
  }

  const milestones = watch("milestones")
  useEffect(() => {
    const subscription = watch(value => {
      if (value.milestones) {
        setStep2Data({
          milestones: value.milestones.map(milestone => ({
            title: milestone?.title ?? "",
            description: milestone?.description ?? "",
            rewardAmount: milestone?.rewardAmount ?? 0,
            prerequisiteIds: milestone?.prerequisiteIds ?? [],
          })),
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [setStep2Data, watch])
  const totalReward = milestones.reduce((sum: number, m: z.infer<typeof milestoneSchema>) => {
    const n = Number(m.rewardAmount)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const onSubmit = (data: Step2Values) => {
    setStep2Data(data)
    goToNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Step 2 — Milestones
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Total: {formatTokens(totalReward)} USDC</span>
          </div>
        </div>

        <div className="border-border bg-background border border-t-0 shadow-md">
          {/* Array-level error */}
          {errors.milestones?.root && (
            <div className="px-6 pt-4">
              <FieldError id="milestones-root-error" message={errors.milestones.root.message} />
            </div>
          )}

          {/* Milestone list */}
          <div className="divide-border divide-y-[2px]">
            {fields.map((field, index) => {
              const titleVal = milestones?.[index]?.title || ""
              const descVal = milestones?.[index]?.description || ""
              const prerequisiteIds = milestones?.[index]?.prerequisiteIds || []

              return (
                <div key={field.id} className="space-y-4 p-5">
                  {/* Milestone header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-accent border-border flex h-6 w-6 items-center justify-center border text-xs font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Milestone {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => swap(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move milestone ${index + 1} up`}
                        className="border-border bg-background hover:bg-secondary neo-press flex h-11 w-11 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => swap(index, index + 1)}
                        disabled={index === fields.length - 1}
                        aria-label={`Move milestone ${index + 1} down`}
                        className="border-border bg-background hover:bg-secondary neo-press flex h-11 w-11 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        aria-label={`Remove milestone ${index + 1}`}
                        className="border-border bg-background hover:bg-destructive/10 hover:border-destructive neo-press flex h-11 w-11 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <FormLabel htmlFor={`milestone-${index}-title`} required>
                      Title
                    </FormLabel>
                    <input
                      id={`milestone-${index}-title`}
                      {...register(`milestones.${index}.title`)}
                      aria-invalid={!!errors.milestones?.[index]?.title}
                      aria-describedby={
                        errors.milestones?.[index]?.title
                          ? `milestone-${index}-title-error`
                          : undefined
                      }
                      placeholder="e.g. Hello World"
                      className={cn(
                        "border-border bg-background w-full border px-4 py-2 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                        errors.milestones?.[index]?.title &&
                          "border-destructive focus:ring-destructive focus:ring-1"
                      )}
                      maxLength={MAX_MILESTONE_TITLE_LEN}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <FieldError
                        id={`milestone-${index}-title-error`}
                        message={errors.milestones?.[index]?.title?.message}
                      />
                      <span
                        className={cn(
                          "ml-auto text-xs font-bold",
                          titleVal.length > MAX_MILESTONE_TITLE_LEN * 0.9
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {titleVal.length}/{MAX_MILESTONE_TITLE_LEN}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <FormLabel htmlFor={`milestone-${index}-description`} required>
                      Description
                    </FormLabel>
                    <textarea
                      id={`milestone-${index}-description`}
                      {...register(`milestones.${index}.description`)}
                      aria-invalid={!!errors.milestones?.[index]?.description}
                      aria-describedby={
                        errors.milestones?.[index]?.description
                          ? `milestone-${index}-description-error`
                          : undefined
                      }
                      rows={2}
                      placeholder="What should the learner do to complete this milestone?"
                      className={cn(
                        "border-border bg-background w-full resize-none border px-4 py-2 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                        errors.milestones?.[index]?.description &&
                          "border-destructive focus:ring-destructive focus:ring-1"
                      )}
                      maxLength={MAX_MILESTONE_DESCRIPTION_LEN}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <FieldError
                        id={`milestone-${index}-description-error`}
                        message={errors.milestones?.[index]?.description?.message}
                      />
                      <span
                        className={cn(
                          "ml-auto text-xs font-bold",
                          descVal.length > MAX_MILESTONE_DESCRIPTION_LEN * 0.9
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {descVal.length}/{MAX_MILESTONE_DESCRIPTION_LEN}
                      </span>
                    </div>
                  </div>

                  {/* Reward Amount */}
                  <div>
                    <FormLabel htmlFor={`milestone-${index}-reward`} required>
                      Reward Amount (USDC)
                    </FormLabel>
                    <div className="flex items-center gap-0">
                      <div className="border-border bg-secondary border border-r-0 px-3 py-2 text-xs font-semibold">
                        USDC
                      </div>
                      <input
                        id={`milestone-${index}-reward`}
                        {...register(`milestones.${index}.rewardAmount`, {
                          valueAsNumber: true,
                        })}
                        aria-invalid={!!errors.milestones?.[index]?.rewardAmount}
                        aria-describedby={
                          errors.milestones?.[index]?.rewardAmount
                            ? `milestone-${index}-reward-error`
                            : undefined
                        }
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="100"
                        className={cn(
                          "border-border bg-background flex-1 border px-4 py-2 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                          errors.milestones?.[index]?.rewardAmount &&
                            "border-destructive focus:ring-destructive focus:ring-1"
                        )}
                      />
                    </div>
                    <FieldError
                      id={`milestone-${index}-reward-error`}
                      message={errors.milestones?.[index]?.rewardAmount?.message}
                    />
                  </div>

                  <div>
                    <FormLabel>Prerequisites</FormLabel>
                    <p className="text-muted-foreground mb-2 text-xs">
                      Select any earlier milestones that must be completed before this work unlocks.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {fields.slice(0, index).map((_, prerequisiteIndex) => {
                        return (
                          <label
                            key={prerequisiteIndex}
                            className="border-border flex cursor-pointer items-center gap-1.5 border px-2 py-1 text-xs font-semibold"
                          >
                            <input
                              type="checkbox"
                              checked={prerequisiteIds.includes(prerequisiteIndex)}
                              onChange={() => {
                                const next = prerequisiteIds.includes(prerequisiteIndex)
                                  ? prerequisiteIds.filter(id => id !== prerequisiteIndex)
                                  : [...prerequisiteIds, prerequisiteIndex]
                                setValue(`milestones.${index}.prerequisiteIds`, next, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }}
                            />{" "}
                            Step {prerequisiteIndex + 1}
                          </label>
                        )
                      })}
                      {index === 0 && (
                        <span className="text-muted-foreground text-xs">
                          First milestone is immediately available.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add & Import buttons */}
          <div className="border-border grid grid-cols-1 gap-3 border-t p-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                append({ title: "", description: "", rewardAmount: 0, prerequisiteIds: [] })
              }
              className="border-border hover:bg-secondary flex w-full cursor-pointer items-center justify-center gap-2 border border-dashed py-3 text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Milestone
            </button>
            <button
              type="button"
              onClick={() => setIsCsvDialogOpen(true)}
              className="border-border bg-accent/30 hover:bg-accent flex w-full cursor-pointer items-center justify-center gap-2 border py-3 text-sm font-semibold transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import CSV
            </button>
          </div>
        </div>
      </div>

      <CsvImportDialog
        isOpen={isCsvDialogOpen}
        onClose={() => setIsCsvDialogOpen(false)}
        onImport={handleBatchImport}
      />

      {/* Running total */}
      <div className="bg-secondary border-border flex items-center justify-between border px-5 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          <span className="text-sm font-semibold">Total reward pool needed</span>
        </div>
        <span className="text-lg font-semibold tabular-nums">{formatTokens(totalReward)} USDC</span>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={goToBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="shimmer-on-hover" disabled={!isValid}>
          Next: Fund & Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
