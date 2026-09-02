import { z } from "zod"
import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react"
import {
  MAX_QUEST_NAME_LEN,
  MAX_QUEST_DESCRIPTION_LEN,
  MAX_MILESTONE_TITLE_LEN,
  MAX_MILESTONE_DESCRIPTION_LEN,
} from "@/lib/contract-types"

// Constants matching contract bounds
const MAX_REWARD_AMOUNT = 1_000_000_000_000_000 // 10^15 raw token units

// Helper to format token amount for display
function formatTokens(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    return `${(amount / 1_000_000_000_000).toFixed(0)}T`
  }
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(0)}B`
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(0)}M`
  }
  return amount.toLocaleString()
}

// Zod schemas
export const step1Schema = z.object({
  name: z
    .string()
    .min(1, "Quest name is required")
    .max(MAX_QUEST_NAME_LEN, `Max ${MAX_QUEST_NAME_LEN} characters`)
    .refine(val => val.trim().length > 0, "Quest name cannot be blank"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(MAX_QUEST_DESCRIPTION_LEN, `Max ${MAX_QUEST_DESCRIPTION_LEN} characters`)
    .refine(val => val.trim().length > 0, "Description cannot be blank"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(32, "Max 32 characters")
    .refine(val => val.trim().length > 0, "Category cannot be blank"),
  tags: z
    .array(
      z
        .string()
        .min(1, "Tag cannot be empty")
        .max(32, "Tag max 32 characters")
        .refine(val => val.trim().length > 0, "Tag cannot be blank")
    )
    .max(5, "Maximum 5 tags allowed")
    .default([]),
  referralBonus: z.number().min(0).max(1000).optional().default(10),
})
export type Step1Values = z.infer<typeof step1Schema>

export const milestoneSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(MAX_MILESTONE_TITLE_LEN, `Title max ${MAX_MILESTONE_TITLE_LEN} characters`)
    .refine(val => val.trim().length > 0, "Title cannot be blank"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(
      MAX_MILESTONE_DESCRIPTION_LEN,
      `Description max ${MAX_MILESTONE_DESCRIPTION_LEN} characters`
    )
    .refine(val => val.trim().length > 0, "Description cannot be blank"),
  rewardAmount: z
    .number({ message: "Reward amount is required" })
    .positive("Reward must be greater than 0")
    .max(MAX_REWARD_AMOUNT, `Reward max ${formatTokens(MAX_REWARD_AMOUNT)} tokens`),
  prerequisiteIds: z.array(z.number().int().nonnegative()).default([]),
})

export const step2Schema = z.object({
  milestones: z
    .array(milestoneSchema)
    .min(1, "At least one milestone is required")
    .max(50, "Maximum 50 milestones per quest"),
})
export type Step2Values = z.infer<typeof step2Schema>

export type FormStep = 1 | 2 | 3
export type TxPhase = "idle" | "funding" | "funded" | "creating" | "created" | "done"

// Helper components
export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null
  return (
    <p
      id={id}
      className="text-destructive mt-1 flex items-center gap-1.5 text-xs font-bold"
      role="alert"
    >
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  )
}

export function FormLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
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
