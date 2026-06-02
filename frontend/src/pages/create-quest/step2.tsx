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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTokens, cn } from "@/lib/utils"
import { step2Schema, milestoneSchema, type Step2Values, FieldError, FormLabel } from "./types"

export function Step2Form({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Step2Values
  onNext: (data: Step2Values) => void
  onBack: () => void
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues,
  })

  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "milestones",
  })

  const milestones = watch("milestones")
  const totalReward = milestones.reduce((sum: number, m: z.infer<typeof milestoneSchema>) => {
    const n = Number(m.rewardAmount)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="text-sm font-black tracking-wider uppercase">Step 2 — Milestones</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5" />
            <span className="text-xs font-black">Total: {formatTokens(totalReward)} USDC</span>
          </div>
        </div>

        <div className="border-border bg-background border-[3px] border-t-0 shadow-[4px_4px_0_var(--color-border)]">
          {/* Array-level error */}
          {errors.milestones?.root && (
            <div className="px-6 pt-4">
              <FieldError message={errors.milestones.root.message} />
            </div>
          )}

          {/* Milestone list */}
          <div className="divide-border divide-y-[2px]">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-5">
                {/* Milestone header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary border-border flex h-6 w-6 items-center justify-center border-[2px] text-xs font-black">
                      {index + 1}
                    </div>
                    <span className="text-muted-foreground text-xs font-black tracking-wider uppercase">
                      Milestone {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => swap(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move milestone ${index + 1} up`}
                      className="border-border bg-background hover:bg-secondary neo-press flex h-11 w-11 cursor-pointer items-center justify-center border-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => swap(index, index + 1)}
                      disabled={index === fields.length - 1}
                      aria-label={`Move milestone ${index + 1} down`}
                      className="border-border bg-background hover:bg-secondary neo-press flex h-11 w-11 cursor-pointer items-center justify-center border-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      aria-label={`Remove milestone ${index + 1}`}
                      className="border-border bg-background hover:bg-destructive/10 hover:border-destructive neo-press flex h-11 w-11 cursor-pointer items-center justify-center border-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <FormLabel required>Title</FormLabel>
                  <input
                    {...register(`milestones.${index}.title`)}
                    placeholder="e.g. Hello World"
                    className={cn(
                      "border-border bg-background w-full border-[2px] px-4 py-2 text-sm font-medium transition-shadow focus:shadow-[3px_3px_0_var(--color-border)] focus:outline-none",
                      errors.milestones?.[index]?.title && "border-destructive"
                    )}
                    maxLength={100}
                  />
                  <FieldError message={errors.milestones?.[index]?.title?.message} />
                </div>

                {/* Description */}
                <div>
                  <FormLabel required>Description</FormLabel>
                  <textarea
                    {...register(`milestones.${index}.description`)}
                    rows={2}
                    placeholder="What should the learner do to complete this milestone?"
                    className={cn(
                      "border-border bg-background w-full resize-none border-[2px] px-4 py-2 text-sm font-medium transition-shadow focus:shadow-[3px_3px_0_var(--color-border)] focus:outline-none",
                      errors.milestones?.[index]?.description && "border-destructive"
                    )}
                    maxLength={500}
                  />
                  <FieldError message={errors.milestones?.[index]?.description?.message} />
                </div>

                {/* Reward Amount */}
                <div>
                  <FormLabel required>Reward Amount (USDC)</FormLabel>
                  <div className="flex items-center gap-0">
                    <div className="border-border bg-secondary border-[2px] border-r-0 px-3 py-2 text-xs font-black">
                      USDC
                    </div>
                    <input
                      {...register(`milestones.${index}.rewardAmount`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="100"
                      className={cn(
                        "border-border bg-background flex-1 border-[2px] px-4 py-2 text-sm font-medium transition-shadow focus:shadow-[3px_3px_0_var(--color-border)] focus:outline-none",
                        errors.milestones?.[index]?.rewardAmount && "border-destructive"
                      )}
                    />
                  </div>
                  <FieldError message={errors.milestones?.[index]?.rewardAmount?.message} />
                </div>
              </div>
            ))}
          </div>

          {/* Add milestone button */}
          <div className="border-border border-t-[2px] p-5">
            <button
              type="button"
              onClick={() => append({ title: "", description: "", rewardAmount: 0 })}
              className="border-border hover:bg-secondary flex w-full cursor-pointer items-center justify-center gap-2 border-[2px] border-dashed py-3 text-sm font-black transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Milestone
            </button>
          </div>
        </div>
      </div>

      {/* Running total */}
      <div className="bg-secondary border-border flex items-center justify-between border-[2px] px-5 py-3 shadow-[3px_3px_0_var(--color-border)]">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          <span className="text-sm font-black">Total reward pool needed</span>
        </div>
        <span className="text-lg font-black tabular-nums">{formatTokens(totalReward)} USDC</span>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="shimmer-on-hover">
          Next: Fund & Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
