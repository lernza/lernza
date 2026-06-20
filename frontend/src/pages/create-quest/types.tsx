import { z } from "zod"
import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react"

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const step1Schema = z.object({
  name: z.string().min(1, "Quest name is required").max(64, "Max 64 characters"),
  description: z.string().min(1, "Description is required").max(2000, "Max 2000 characters"),
})
export type Step1Values = z.infer<typeof step1Schema>

export const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Max 500 characters"),
  rewardAmount: z.number().positive("Must be greater than 0"),
})

export const step2Schema = z.object({
  milestones: z.array(milestoneSchema).min(1, "At least one milestone is required"),
})
export type Step2Values = z.infer<typeof step2Schema>

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormStep = 1 | 2 | 3
export type TxPhase = "idle" | "funding" | "funded" | "creating" | "done"

// ─── Helper components ────────────────────────────────────────────────────────

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-destructive mt-1 flex items-center gap-1.5 text-xs font-bold">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  )
}

export function FormLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="mb-1.5 block text-sm font-semibold">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}

export function StepIndicator({ current }: { current: FormStep }) {
  const steps = [
    { n: 1, label: "Basics" },
    { n: 2, label: "Milestones" },
    { n: 3, label: "Fund & Review" },
  ]
  return (
    <div className="mb-8 flex items-center gap-0">
      {steps.map((s, i) => {
        const done = typeof current === "number" && current > s.n
        const active = current === s.n
        return (
          <div key={s.n} className="flex items-center">
            <div
              className={cn(
                "border-border flex items-center gap-2 border px-4 py-2 text-xs font-semibold tracking-wider uppercase",
                active && "bg-accent shadow-sm",
                done && "bg-success",
                !active && !done && "bg-background text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center border-[1.5px] border-current text-[10px] font-semibold",
                  done && "border-border"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : s.n}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="h-[2px] w-6 bg-black" />}
          </div>
        )
      })}
    </div>
  )
}
