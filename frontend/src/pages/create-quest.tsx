import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
  Check,
  Wallet,
  Loader2,
  Coins,
  Target,
  FileText,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FieldError, FormLabel } from "@/components/ui/form-field"
import { useWallet } from "@/hooks/use-wallet"
import { useTransactionAction } from "@/hooks/use-transaction-action"
import { formatTokens, cn } from "@/lib/utils"

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, "Quest name is required").max(64, "Max 64 characters"),
  description: z.string().min(1, "Description is required").max(2000, "Max 2000 characters"),
})
type Step1Values = z.infer<typeof step1Schema>

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Max 500 characters"),
  rewardAmount: z.number().positive("Must be greater than 0"),
})

const step2Schema = z.object({
  milestones: z.array(milestoneSchema).min(1, "At least one milestone is required"),
})
type Step2Values = z.infer<typeof step2Schema>

// ─── Types ────────────────────────────────────────────────────────────────────

type FormStep = 1 | 2 | 3

// ─── Draft persistence ────────────────────────────────────────────────────────

const DRAFT_KEY = "lernza:quest-draft"

type QuestDraft = {
  step: FormStep
  step1Data: Step1Values
  step2Data: Step2Values
}

function loadDraft(): QuestDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as QuestDraft) : null
  } catch {
    return null
  }
}

function saveDraft(draft: QuestDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // storage unavailable — fail silently
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// ─── Helper components ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: FormStep }) {
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
                "border-border flex items-center gap-2 border-[2px] px-4 py-2 text-xs font-black tracking-wider uppercase",
                active && "bg-primary shadow-[2px_2px_0_var(--color-border)]",
                done && "bg-success",
                !active && !done && "bg-background text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center border-[1.5px] border-current text-[10px] font-black",
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

// ─── Step 1: Quest Basics ─────────────────────────────────────────────────────

function Step1Form({
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
        <div className="bg-primary border-border border-b-[3px] px-6 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-black tracking-wider uppercase">
              Step 1 — Quest Basics
            </span>
          </div>
        </div>
        <div className="border-border bg-background space-y-5 border-[3px] border-t-0 p-6 shadow-[4px_4px_0_var(--color-border)]">
          {/* Name */}
          <div>
            <FormLabel required>Quest Name</FormLabel>
            <input
              {...register("name")}
              placeholder="e.g. Learn to Code with Alex"
              className={cn(
                "border-border bg-background w-full border-[2px] px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-[3px_3px_0_var(--color-border)] focus:outline-none",
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
                "border-border bg-background w-full resize-none border-[2px] px-4 py-2.5 text-sm font-medium transition-shadow focus:shadow-[3px_3px_0_var(--color-border)] focus:outline-none",
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

// ─── Step 2: Milestones ───────────────────────────────────────────────────────

function Step2Form({
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
                      className="border-border bg-background hover:bg-secondary neo-press flex h-7 w-7 cursor-pointer items-center justify-center border-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => swap(index, index + 1)}
                      disabled={index === fields.length - 1}
                      className="border-border bg-background hover:bg-secondary neo-press flex h-7 w-7 cursor-pointer items-center justify-center border-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="border-border bg-background hover:bg-destructive/10 hover:border-destructive neo-press flex h-7 w-7 cursor-pointer items-center justify-center border-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
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

// ─── Step 3: Fund & Review ────────────────────────────────────────────────────

function Step3Review({
  step1Data,
  step2Data,
  onBack,
  onComplete,
}: {
  step1Data: Step1Values
  step2Data: Step2Values
  onBack: () => void
  onComplete: () => void
}) {
  const { isSupportedNetwork } = useWallet()
  const fundingTx = useTransactionAction()
  const createTx = useTransactionAction()

  const totalReward = step2Data.milestones.reduce(
    (sum: number, m: z.infer<typeof milestoneSchema>) => sum + m.rewardAmount,
    0
  )

  const handleFund = async () => {
    await fundingTx.run(async () => {
      await new Promise(r => setTimeout(r, 1200))
      return true
    })
  }

  const handleCreate = async () => {
    await createTx.run(async () => {
      await new Promise(r => setTimeout(r, 1200))
      return true
    })
    onComplete()
  }

  const isFunded = fundingTx.isSuccess
  const fundPending = fundingTx.isPending
  const createPending = createTx.isPending

  return (
    <div className="space-y-6">
      <div>
        <div className="bg-primary border-border border-b-[3px] px-6 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-black tracking-wider uppercase">
              Step 3 — Fund & Review
            </span>
          </div>
        </div>
        <div className="border-border bg-background divide-border divide-y-[2px] border-[3px] border-t-0 shadow-[4px_4px_0_var(--color-border)]">
          {/* Quest summary */}
          <div className="space-y-2 p-5">
            <p className="text-muted-foreground mb-3 text-xs font-black tracking-wider uppercase">
              Quest Details
            </p>
            <h3 className="text-xl font-black">{step1Data.name}</h3>
            <p className="text-muted-foreground text-sm">{step1Data.description}</p>
          </div>

          {/* Milestones list */}
          <div className="p-5">
            <p className="text-muted-foreground mb-3 text-xs font-black tracking-wider uppercase">
              Milestones ({step2Data.milestones.length})
            </p>
            <div className="space-y-2">
              {step2Data.milestones.map((m: z.infer<typeof milestoneSchema>, i: number) => (
                <div
                  key={i}
                  className="bg-secondary border-border flex items-start justify-between gap-3 border-[1.5px] p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="bg-primary border-border mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border-[1.5px] text-[10px] font-black">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black">{m.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">{m.description}</p>
                    </div>
                  </div>
                  <Badge variant="default" className="flex-shrink-0 tabular-nums">
                    {m.rewardAmount} USDC
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Fund pool section */}
          <div className="p-5">
            <p className="text-muted-foreground mb-3 text-xs font-black tracking-wider uppercase">
              Reward Pool
            </p>
            <div className="bg-primary border-border mb-4 flex items-center justify-between border-[2px] p-4 shadow-[3px_3px_0_var(--color-border)]">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <span className="font-black">Total USDC needed</span>
              </div>
              <span className="text-xl font-black tabular-nums">
                {formatTokens(totalReward)} USDC
              </span>
            </div>

            {/* Network Warning */}
            {!isSupportedNetwork && (
              <div className="bg-destructive/10 border-destructive mb-4 border-[2px] p-4 text-center">
                <AlertCircle className="text-destructive mx-auto mb-2 h-5 w-5" />
                <p className="text-destructive text-sm font-bold">
                  Please switch your Freighter wallet to Testnet to continue.
                </p>
              </div>
            )}

            {/* Fund button */}
              <Button
                onClick={handleFund}
                disabled={fundPending || createPending || isFunded || !isSupportedNetwork}
                variant={isFunded || createPending || createTx.isSuccess ? "secondary" : "default"}
                className={cn(
                  "shimmer-on-hover mb-3 w-full",
                  (isFunded || createPending || createTx.isSuccess) && "border-success"
                )}
              >
                {fundPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Funding reward pool...
                  </>
                ) : isFunded || createPending || createTx.isSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    Reward pool funded
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  Fund Reward Pool ({formatTokens(totalReward)} USDC)
                </>
              )}
            </Button>

            {/* Create button */}
              <Button
                onClick={handleCreate}
                disabled={!isFunded || createPending || !isSupportedNetwork}
                className="shimmer-on-hover w-full"
              >
                {createPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating quest on-chain...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Confirm & Create Quest
                </>
              )}
              </Button>

            {fundingTx.isFailure && (
              <p className="text-destructive mt-2 text-center text-xs font-bold">
                {fundingTx.error ?? "Funding failed. Try again."}
              </p>
            )}
            {createTx.isFailure && (
              <p className="text-destructive mt-2 text-center text-xs font-bold">
                {createTx.error ?? "Creation failed. Try again."}
              </p>
            )}
            {!isFunded && !fundPending && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                Fund the pool first, then confirm to create the quest on Stellar.
              </p>
            )}
            {isFunded && !createPending && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                Pool funded! Sign the creation transaction to go live.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={fundPending || createPending}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_STEP1: Step1Values = { name: "", description: "" }
const DEFAULT_STEP2: Step2Values = {
  milestones: [{ title: "", description: "", rewardAmount: 0 }],
}

export function CreateQuest() {
  const navigate = useNavigate()
  const { connected, connect, loading } = useWallet()

  const [step, setStep] = useState<FormStep>(() => loadDraft()?.step ?? 1)
  const [step1Data, setStep1Data] = useState<Step1Values>(
    () => loadDraft()?.step1Data ?? DEFAULT_STEP1
  )
  const [step2Data, setStep2Data] = useState<Step2Values>(
    () => loadDraft()?.step2Data ?? DEFAULT_STEP2
  )

  useEffect(() => {
    saveDraft({ step, step1Data, step2Data })
  }, [step, step1Data, step2Data])

  // Wallet not connected guard
  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-md px-4">
          <div className="bg-background border-border animate-scale-in overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
            <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
              <span className="text-xs font-black tracking-wider uppercase">Create Quest</span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>
            <div className="p-8 text-center">
              <div className="bg-primary border-border mx-auto mb-5 flex h-16 w-16 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                <Wallet className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-2xl font-black">Connect your wallet</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                You need a connected Freighter wallet to create a quest and sign on-chain
                transactions.
              </p>
              <Button
                size="lg"
                onClick={connect}
                disabled={loading}
                className="shimmer-on-hover w-full"
              >
                <Wallet className="h-4 w-4" />
                {loading ? "Connecting..." : "Connect Wallet"}
              </Button>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-muted-foreground hover:text-foreground mx-auto mt-4 flex cursor-pointer items-center gap-1 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
      >
        <div className="border-border bg-background neo-press hover:bg-primary flex h-7 w-7 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Page heading */}
      <div className="animate-fade-in-up relative mb-6">
        <h1 className="text-3xl font-black">Create a Quest</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set up milestones and fund the reward pool to incentivize learners.
        </p>
        <p className="text-muted-foreground mt-2 max-w-2xl text-xs font-bold">
          Note: quest visibility on Stellar is discovery-only. Even quests marked private remain
          readable on-chain by quest id, so do not put confidential data in quest metadata.
        </p>
      </div>

      {/* Step indicator */}
      <div className="animate-fade-in-up stagger-1 relative">
        <StepIndicator current={step} />
      </div>

      {/* Step content */}
      <div className="animate-fade-in-up stagger-2 relative">
        {step === 1 && (
          <Step1Form
            defaultValues={step1Data}
            onNext={data => {
              setStep1Data(data)
              setStep(2)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}

        {step === 2 && (
          <Step2Form
            defaultValues={step2Data}
            onNext={data => {
              setStep2Data(data)
              setStep(3)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
            onBack={() => {
              setStep(1)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}

        {step === 3 && (
          <Step3Review
            step1Data={step1Data}
            step2Data={step2Data}
            onBack={() => {
              setStep(2)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
            onComplete={() => {
              clearDraft()
              navigate("/dashboard")
            }}
          />
        )}
      </div>
    </div>
  )
}
