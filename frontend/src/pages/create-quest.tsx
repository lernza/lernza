import { useState } from "react"
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
  ExternalLink,
  Coins,
  Target,
  FileText,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { MOCK_WORKSPACES, MOCK_MILESTONES } from "@/lib/mock-data"
import { formatTokens, cn } from "@/lib/utils"

// Testnet USDC SAC contract address (pre-filled)
const TESTNET_USDC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z
    .string()
    .min(1, "Quest name is required")
    .max(64, "Max 64 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Max 2000 characters"),
})
type Step1Values = z.infer<typeof step1Schema>

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Max 500 characters"),
  rewardAmount: z.number().positive("Must be greater than 0"),
})

const step2Schema = z.object({
  milestones: z
    .array(milestoneSchema)
    .min(1, "At least one milestone is required"),
})
type Step2Values = z.infer<typeof step2Schema>

// ─── Types ────────────────────────────────────────────────────────────────────

type FormStep = 1 | 2 | 3 | "success"
type TxPhase = "idle" | "funding" | "funded" | "creating" | "done"

interface CreateQuestProps {
  onBack: () => void
  onQuestCreated: (id: number) => void
}

// ─── Helper components ────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-xs font-bold text-destructive mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  )
}

function FormLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block text-sm font-black mb-1.5">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}

function StepIndicator({ current }: { current: FormStep }) {
  const steps = [
    { n: 1, label: "Basics" },
    { n: 2, label: "Milestones" },
    { n: 3, label: "Fund & Review" },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done = typeof current === "number" && current > s.n
        const active = current === s.n
        return (
          <div key={s.n} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-[2px] border-black text-xs font-black uppercase tracking-wider",
                active && "bg-primary shadow-[2px_2px_0_#000]",
                done && "bg-success",
                !active && !done && "bg-white text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 border-[1.5px] border-current flex items-center justify-center text-[10px] font-black",
                  done && "border-black"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : s.n}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-6 h-[2px] bg-black" />
            )}
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
        <div className="bg-primary border-b-[3px] border-black px-6 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-black uppercase tracking-wider">
              Step 1 — Quest Basics
            </span>
          </div>
        </div>
        <div className="border-[3px] border-t-0 border-black p-6 bg-white shadow-[4px_4px_0_#000] space-y-5">
          {/* Name */}
          <div>
            <FormLabel required>Quest Name</FormLabel>
            <input
              {...register("name")}
              placeholder="e.g. Learn to Code with Alex"
              className={cn(
                "w-full border-[2px] border-black px-4 py-2.5 text-sm font-medium focus:outline-none focus:shadow-[3px_3px_0_#000] transition-shadow bg-white",
                errors.name && "border-destructive"
              )}
              maxLength={64}
            />
            <div className="flex items-center justify-between mt-1">
              <FieldError message={errors.name?.message} />
              <span
                className={cn(
                  "text-xs font-bold ml-auto",
                  nameValue.length > 56
                    ? "text-destructive"
                    : "text-muted-foreground"
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
                "w-full border-[2px] border-black px-4 py-2.5 text-sm font-medium focus:outline-none focus:shadow-[3px_3px_0_#000] transition-shadow resize-none bg-white",
                errors.description && "border-destructive"
              )}
              maxLength={2000}
            />
            <div className="flex items-center justify-between mt-1">
              <FieldError message={errors.description?.message} />
              <span
                className={cn(
                  "text-xs font-bold ml-auto",
                  descValue.length > 1800
                    ? "text-destructive"
                    : "text-muted-foreground"
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
  const totalReward = milestones.reduce((sum, m) => {
    const n = Number(m.rewardAmount)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="text-sm font-black uppercase tracking-wider">
              Step 2 — Milestones
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5" />
            <span className="text-xs font-black">
              Total: {formatTokens(totalReward)} USDC
            </span>
          </div>
        </div>

        <div className="border-[3px] border-t-0 border-black bg-white shadow-[4px_4px_0_#000]">
          {/* Array-level error */}
          {errors.milestones?.root && (
            <div className="px-6 pt-4">
              <FieldError message={errors.milestones.root.message} />
            </div>
          )}

          {/* Milestone list */}
          <div className="divide-y-[2px] divide-black">
            {fields.map((field, index) => (
              <div key={field.id} className="p-5 space-y-4">
                {/* Milestone header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary border-[2px] border-black flex items-center justify-center text-xs font-black">
                      {index + 1}
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Milestone {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => swap(index, index - 1)}
                      disabled={index === 0}
                      className="w-7 h-7 border-[2px] border-black bg-white flex items-center justify-center hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors neo-press cursor-pointer"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => swap(index, index + 1)}
                      disabled={index === fields.length - 1}
                      className="w-7 h-7 border-[2px] border-black bg-white flex items-center justify-center hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors neo-press cursor-pointer"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="w-7 h-7 border-[2px] border-black bg-white flex items-center justify-center hover:bg-destructive/10 hover:border-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors neo-press cursor-pointer"
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
                      "w-full border-[2px] border-black px-4 py-2 text-sm font-medium focus:outline-none focus:shadow-[3px_3px_0_#000] transition-shadow bg-white",
                      errors.milestones?.[index]?.title && "border-destructive"
                    )}
                    maxLength={100}
                  />
                  <FieldError
                    message={errors.milestones?.[index]?.title?.message}
                  />
                </div>

                {/* Description */}
                <div>
                  <FormLabel required>Description</FormLabel>
                  <textarea
                    {...register(`milestones.${index}.description`)}
                    rows={2}
                    placeholder="What should the learner do to complete this milestone?"
                    className={cn(
                      "w-full border-[2px] border-black px-4 py-2 text-sm font-medium focus:outline-none focus:shadow-[3px_3px_0_#000] transition-shadow resize-none bg-white",
                      errors.milestones?.[index]?.description &&
                        "border-destructive"
                    )}
                    maxLength={500}
                  />
                  <FieldError
                    message={errors.milestones?.[index]?.description?.message}
                  />
                </div>

                {/* Reward Amount */}
                <div>
                  <FormLabel required>Reward Amount (USDC)</FormLabel>
                  <div className="flex items-center gap-0">
                    <div className="border-[2px] border-r-0 border-black bg-secondary px-3 py-2 text-xs font-black">
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
                        "flex-1 border-[2px] border-black px-4 py-2 text-sm font-medium focus:outline-none focus:shadow-[3px_3px_0_#000] transition-shadow bg-white",
                        errors.milestones?.[index]?.rewardAmount &&
                          "border-destructive"
                      )}
                    />
                  </div>
                  <FieldError
                    message={errors.milestones?.[index]?.rewardAmount?.message}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add milestone button */}
          <div className="p-5 border-t-[2px] border-black">
            <button
              type="button"
              onClick={() =>
                append({ title: "", description: "", rewardAmount: 0 })
              }
              className="w-full border-[2px] border-dashed border-black py-3 flex items-center justify-center gap-2 text-sm font-black hover:bg-secondary transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Milestone
            </button>
          </div>
        </div>
      </div>

      {/* Running total */}
      <div className="bg-secondary border-[2px] border-black px-5 py-3 flex items-center justify-between shadow-[3px_3px_0_#000]">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          <span className="text-sm font-black">Total reward pool needed</span>
        </div>
        <span className="text-lg font-black tabular-nums">
          {formatTokens(totalReward)} USDC
        </span>
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
  onComplete: (questId: number) => void
}) {
  const { address } = useWallet()
  const [txPhase, setTxPhase] = useState<TxPhase>("idle")

  const totalReward = step2Data.milestones.reduce(
    (sum, m) => sum + m.rewardAmount,
    0
  )

  const handleFund = async () => {
    setTxPhase("funding")
    // Simulate funding transaction via Freighter
    await new Promise((r) => setTimeout(r, 2000))
    setTxPhase("funded")
  }

  const handleCreate = async () => {
    setTxPhase("creating")
    // Simulate quest creation transaction via Freighter
    await new Promise((r) => setTimeout(r, 2000))

    // Add to mock data
    const newId = MOCK_WORKSPACES.length
    MOCK_WORKSPACES.push({
      id: newId,
      owner: address ?? "GUNK...NOWN",
      name: step1Data.name,
      description: step1Data.description,
      tokenAddr: TESTNET_USDC,
      enrolleeCount: 0,
      milestoneCount: step2Data.milestones.length,
      poolBalance: totalReward,
      // eslint-disable-next-line react-hooks/purity
      createdAt: Math.floor(Date.now() / 1000),
    })
    // eslint-disable-next-line react-hooks/immutability
    MOCK_MILESTONES[newId] = step2Data.milestones.map((m, i) => ({
      id: i,
      workspaceId: newId,
      title: m.title,
      description: m.description,
      rewardAmount: m.rewardAmount,
    }))

    setTxPhase("done")
    onComplete(newId)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="bg-primary border-b-[3px] border-black px-6 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-black uppercase tracking-wider">
              Step 3 — Fund & Review
            </span>
          </div>
        </div>
        <div className="border-[3px] border-t-0 border-black bg-white shadow-[4px_4px_0_#000] divide-y-[2px] divide-black">
          {/* Quest summary */}
          <div className="p-5 space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
              Quest Details
            </p>
            <h3 className="text-xl font-black">{step1Data.name}</h3>
            <p className="text-sm text-muted-foreground">
              {step1Data.description}
            </p>
          </div>

          {/* Milestones list */}
          <div className="p-5">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
              Milestones ({step2Data.milestones.length})
            </p>
            <div className="space-y-2">
              {step2Data.milestones.map((m, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 p-3 bg-secondary border-[1.5px] border-black"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-primary border-[1.5px] border-black flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.description}
                      </p>
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
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
              Reward Pool
            </p>
            <div className="flex items-center justify-between p-4 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] mb-4">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <span className="font-black">Total USDC needed</span>
              </div>
              <span className="text-xl font-black tabular-nums">
                {formatTokens(totalReward)} USDC
              </span>
            </div>

            {/* Fund button */}
            <Button
              onClick={handleFund}
              disabled={txPhase !== "idle"}
              variant={txPhase === "funded" || txPhase === "creating" || txPhase === "done" ? "secondary" : "default"}
              className={cn(
                "w-full mb-3 shimmer-on-hover",
                (txPhase === "funded" || txPhase === "creating" || txPhase === "done") &&
                  "border-success"
              )}
            >
              {txPhase === "funding" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Funding reward pool...
                </>
              ) : txPhase === "funded" || txPhase === "creating" || txPhase === "done" ? (
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
              disabled={txPhase !== "funded"}
              className="w-full shimmer-on-hover"
            >
              {txPhase === "creating" ? (
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

            {txPhase === "idle" && (
              <p className="text-xs font-bold text-muted-foreground text-center mt-2">
                Fund the pool first, then confirm to create the quest on Stellar.
              </p>
            )}
            {txPhase === "funded" && (
              <p className="text-xs font-bold text-muted-foreground text-center mt-2">
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
          disabled={txPhase === "funding" || txPhase === "creating"}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  )
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  questId,
  questName,
  onViewQuest,
  onDashboard,
}: {
  questId: number
  questName: string
  onViewQuest: (id: number) => void
  onDashboard: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 animate-fade-in-up">
      <div className="w-20 h-20 bg-success border-[3px] border-black shadow-[6px_6px_0_#000] flex items-center justify-center mb-6 animate-scale-in">
        <Check className="h-10 w-10" />
      </div>
      <h2 className="text-3xl font-black mb-3 animate-fade-in-up stagger-1">
        Quest Created!
      </h2>
      <p className="text-muted-foreground mb-2 max-w-sm animate-fade-in-up stagger-2">
        <span className="font-black text-foreground">"{questName}"</span> is
        now live on Stellar testnet with a funded reward pool.
      </p>
      <div className="flex items-center gap-2 mb-8 bg-secondary border-[2px] border-black px-4 py-2 shadow-[2px_2px_0_#000] animate-fade-in-up stagger-3">
        <div className="w-2 h-2 bg-success border border-black" />
        <span className="text-xs font-black font-mono">Quest #{questId} on Stellar Testnet</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up stagger-4">
        <Button
          onClick={() => onViewQuest(questId)}
          className="shimmer-on-hover"
        >
          <ExternalLink className="h-4 w-4" />
          View Quest
        </Button>
        <Button variant="outline" onClick={onDashboard}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateQuest({ onBack, onQuestCreated }: CreateQuestProps) {
  const { connected, connect, loading } = useWallet()
  const [step, setStep] = useState<FormStep>(1)
  const [createdQuestId, setCreatedQuestId] = useState<number | null>(null)
  const [createdQuestName, setCreatedQuestName] = useState("")

  const [step1Data, setStep1Data] = useState<Step1Values>({
    name: "",
    description: "",
  })
  const [step2Data, setStep2Data] = useState<Step2Values>({
    milestones: [{ title: "", description: "", rewardAmount: 0 }],
  })

  // Wallet not connected guard
  if (!connected) {
    return (
      <div className="min-h-[calc(100vh-67px)] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots pointer-events-none" />
        <div className="relative px-4 max-w-md mx-auto w-full">
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0_#000] overflow-hidden animate-scale-in">
            <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">
                Create Quest
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-destructive border border-black" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-5 mx-auto">
                <Wallet className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-black mb-2">Connect your wallet</h2>
              <p className="text-muted-foreground text-sm mb-6">
                You need a connected Freighter wallet to create a quest and sign
                on-chain transactions.
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
                onClick={onBack}
                className="mt-4 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 mx-auto"
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
    <div className="relative mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-30" />

      {/* Back button (hidden on success) */}
      {step !== "success" && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 border-[2px] border-black bg-white shadow-[2px_2px_0_#000] flex items-center justify-center neo-press hover:bg-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
          </div>
          Back to Dashboard
        </button>
      )}

      {/* Page heading */}
      {step !== "success" && (
        <div className="mb-6 relative animate-fade-in-up">
          <h1 className="text-3xl font-black">Create a Quest</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set up milestones and fund the reward pool to incentivize learners.
          </p>
        </div>
      )}

      {/* Step indicator */}
      {step !== "success" && (
        <div className="relative animate-fade-in-up stagger-1">
          <StepIndicator current={step} />
        </div>
      )}

      {/* Step content */}
      <div className="relative animate-fade-in-up stagger-2">
        {step === 1 && (
          <Step1Form
            defaultValues={step1Data}
            onNext={(data) => {
              setStep1Data(data)
              setStep(2)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}

        {step === 2 && (
          <Step2Form
            defaultValues={step2Data}
            onNext={(data) => {
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
            onComplete={(questId) => {
              setCreatedQuestId(questId)
              setCreatedQuestName(step1Data.name)
              setStep("success")
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}

        {step === "success" && createdQuestId !== null && (
          <SuccessScreen
            questId={createdQuestId}
            questName={createdQuestName}
            onViewQuest={(id) => onQuestCreated(id)}
            onDashboard={onBack}
          />
        )}
      </div>
    </div>
  )
}
