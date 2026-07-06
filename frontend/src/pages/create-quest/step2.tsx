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
import { step2Schema, milestoneSchema, Step2Values, FieldError, FormLabel } from "./types"
import { useQuestCreation } from "./context"

export function Step2Form() {
  const { step2Data, setStep2Data, goToNext, goToBack } = useQuestCreation()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: step2Data,
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
                  <FormLabel required>Title</FormLabel>
                  <input
                    {...register(`milestones.${index}.title`)}
                    placeholder="e.g. Hello World"
                    className={cn(
                      "border-border bg-background w-full border px-4 py-2 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
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
                      "border-border bg-background w-full resize-none border px-4 py-2 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
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
                    <div className="border-border bg-secondary border border-r-0 px-3 py-2 text-xs font-semibold">
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
                        "border-border bg-background flex-1 border px-4 py-2 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
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
          <div className="border-border border-t p-5">
            <button
              type="button"
              onClick={() => append({ title: "", description: "", rewardAmount: 0 })}
              className="border-border hover:bg-secondary flex w-full cursor-pointer items-center justify-center gap-2 border border-dashed py-3 text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Milestone
            </button>
          </div>
        </div>
      </div>

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
        <Button type="submit" className="shimmer-on-hover">
          Next: Fund & Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
