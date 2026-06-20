import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { step1Schema, type Step1Values, FieldError, FormLabel } from "./types"

export function Step1Form({
  defaultValues,
  onNext,
}: {
  defaultValues: Step1Values
  onNext: (data: Step1Values) => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues,
  })

  const nameValue = watch("name", "")
  const descValue = watch("description", "")

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <div className="bg-accent border-border border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Step 1 — Quest Basics
            </span>
          </div>
        </div>
        <div className="border-border bg-background space-y-5 border border-t-0 p-6 shadow-md">
          {/* Name */}
          <div>
            <FormLabel required>Quest Name</FormLabel>
            <input
              {...register("name")}
              placeholder="e.g. Learn to Code with Alex"
              className={cn(
                "border-border bg-background w-full border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.name && "border-destructive"
              )}
              maxLength={64}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError message={errors.name?.message} />
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
            <FormLabel required>Description</FormLabel>
            <textarea
              {...register("description")}
              rows={5}
              placeholder="Describe what learners will accomplish..."
              className={cn(
                "border-border bg-background w-full resize-none border px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-md focus:outline-none",
                errors.description && "border-destructive"
              )}
              maxLength={2000}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError message={errors.description?.message} />
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
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="shimmer-on-hover">
          Next: Add Milestones
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
