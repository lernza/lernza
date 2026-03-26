import { useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Plus,
  Users,
  Target,
  Coins,
  CheckCircle2,
  Circle,
  UserPlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FieldError, FormLabel } from "@/components/ui/form-field"
import { cn, formatTokens } from "@/lib/utils"
import { SkeletonMilestoneList, SkeletonStatsRow, SkeletonEnrolleeList } from "@/components/ui/skeleton"
import { useInView, useCountUp } from "@/hooks/use-animations"
import { useContractData } from "@/hooks/use-async-data"
import { useToast } from "@/hooks/use-toast"
import { ToastContainer } from "@/components/toast"
import { ShareButton } from "@/components/share-button"
import { QuestMetadata } from "@/components/quest-metadata"
import { useWallet } from "@/hooks/use-wallet"
import { questClient } from "@/lib/contracts/quest"
import { MilestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"
import { useTransactionAction } from "@/hooks/use-transaction-action"

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const milestoneFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Max 500 characters"),
  rewardAmount: z
    .string()
    .min(1, "Reward amount is required")
    .refine(v => Number.isFinite(Number(v)) && Number(v) >= 0, "Must be a non-negative number"),
})
type MilestoneFormValues = z.infer<typeof milestoneFormSchema>

const enrolleeFormSchema = z.object({
  address: z
    .string()
    .min(1, "Stellar address is required")
    .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key (starts with G)"),
})
type EnrolleeFormValues = z.infer<typeof enrolleeFormSchema>

// ─────────────────────────────────────────────────────────────────────────────

type Tab = "milestones" | "enrollees"

const milestoneClient = new MilestoneClient()

export function QuestView() {
  const { id } = useParams()
  const questId = Number(id)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>("milestones")
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null)
  const [showAddEnrollee, setShowAddEnrollee] = useState(false)
  const [addPhase, setAddPhase] = useState<"idle" | "submitting" | "done" | "error">("idle")

  const { toasts, addToast, removeToast } = useToast()
  const { address, isSupportedNetwork } = useWallet()

  // Fetch quest data from contracts
  const { data: questData, isLoading: questLoading } = useContractData(
    `quest-${questId}`,
    async () => {
      const [quests, milestones, enrollees, poolBalance] = await Promise.all([
        questClient.getQuests(),
        milestoneClient.getMilestones(questId),
        questClient.getEnrollees(questId),
        rewardsClient.getPoolBalance(questId),
      ])
      const ws = quests.find(q => q.id === questId)
      const poolNum =
        poolBalance > BigInt(Number.MAX_SAFE_INTEGER)
          ? Number.MAX_SAFE_INTEGER
          : Number(poolBalance)
      return { ws, milestones, enrollees, poolBalance: poolNum }
    },
    { dependencies: [questId] }
  )

  const ws = questData?.ws
  const milestones = questData?.milestones ?? []
  const poolBalance = questData?.poolBalance ?? 0

  const [localEnrollees, setLocalEnrollees] = useState<string[]>([])
  const [localCompletions, setLocalCompletions] = useState<
    { milestoneId: number; enrollee: string; completed: boolean }[]
  >([])

  // Sync enrollees from contract data
  if (questData?.enrollees && localEnrollees.length === 0 && questData.enrollees.length > 0) {
    setLocalEnrollees(questData.enrollees)
  }

  const isOwner = !!address && address === ws?.owner

  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const addEnrolleeTx = useTransactionAction()
  const createMilestoneTx = useTransactionAction()
  const verifyPayoutTx = useTransactionAction()
  const removeEnrolleeTx = useTransactionAction()
  const [activeMilestoneTxId, setActiveMilestoneTxId] = useState<number | null>(null)

  const milestoneForm = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: { title: "", description: "", rewardAmount: "" },
  })

  const enrolleeForm = useForm<EnrolleeFormValues>({
    resolver: zodResolver(enrolleeFormSchema),
    defaultValues: { address: "" },
  })

  const resetMilestoneForm = useCallback(() => {
    milestoneForm.reset()
    setShowMilestoneForm(false)
  }, [milestoneForm])

  const handleCreateMilestone = useCallback(
    async (values: MilestoneFormValues) => {
      if (!address) {
        addToast("Connect your wallet first.", "error")
        return
      }
      const reward = Number(values.rewardAmount)
      try {
        await createMilestoneTx.run(async () => {
          const result = await milestoneClient.createMilestone(
            address,
            questId,
            values.title,
            values.description,
            BigInt(reward)
          )
          if (result.status !== "SUCCESS") {
            throw new Error(result.error || "Transaction failed. Please try again.")
          }
          return result
        })
        addToast("Milestone created successfully!", "success")
        resetMilestoneForm()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        addToast(`Failed to create milestone: ${message}`, "error")
      }
    },
    [address, questId, addToast, resetMilestoneForm, createMilestoneTx]
  )

  const [statsRef, statsInView] = useInView()
  const [contentRef, contentInView] = useInView()

  const totalReward = milestones.reduce((sum, m) => sum + Number(m.rewardAmount ?? m.reward_amount ?? 0), 0)
  const completedMilestones = new Set(
    localCompletions.filter(c => c.completed).map(c => c.milestoneId)
  ).size
  const isComplete = completedMilestones === milestones.length && milestones.length > 0
  const earnedReward = milestones
    .filter(m => localCompletions.some(c => c.milestoneId === m.id && c.completed))
    .reduce((sum, m) => sum + Number(m.rewardAmount ?? m.reward_amount ?? 0), 0)

  const closeAddEnrollee = useCallback(() => {
    setShowAddEnrollee(false)
    enrolleeForm.reset()
    addEnrolleeTx.reset()
    setAddPhase("idle")
  }, [enrolleeForm, addEnrolleeTx])

  const handleAddEnrollee = useCallback(
    async (values: EnrolleeFormValues) => {
      if (!address) return
      setAddPhase("submitting")
      try {
        await addEnrolleeTx.run(async () => {
          const result = await questClient.addEnrollee(address, questId, values.address)
          if (result.status !== "SUCCESS") {
            throw new Error(result.error ?? "Transaction failed. Please try again.")
          }
          return result
        })
        setLocalEnrollees(prev => [...prev, values.address])
        setAddPhase("done")
        addToast("Enrollee added successfully", "success")
        setTimeout(closeAddEnrollee, 1500)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Transaction failed. Please try again."
        setAddPhase("error")
        enrolleeForm.setError("address", { message })
      }
    },
    [address, questId, addToast, closeAddEnrollee, addEnrolleeTx, enrolleeForm]
  )

  const handleVerifyAndPayout = async (milestoneId: number, rewardAmount: number) => {
    if (!address) {
      addToast("Connect your wallet first.", "error")
      return
    }

    const target = localEnrollees.find(
      enrollee =>
        !localCompletions.some(
          completion =>
            completion.enrollee === enrollee &&
            completion.milestoneId === milestoneId &&
            completion.completed
        )
    )

    if (!target) {
      addToast("All enrollees are already verified for this milestone.", "info")
      return
    }

    setActiveMilestoneTxId(milestoneId)
    try {
      await verifyPayoutTx.run(async () => {
        const verifyResult = await milestoneClient.verifyCompletion(
          address,
          questId,
          milestoneId,
          target
        )
        if (verifyResult.status !== "SUCCESS") {
          throw new Error(verifyResult.error ?? "Milestone verification failed.")
        }

        const payoutResult = await rewardsClient.distributeReward(
          address,
          questId,
          milestoneId,
          target,
          BigInt(rewardAmount)
        )
        if (payoutResult.status !== "SUCCESS") {
          throw new Error(payoutResult.error ?? "Reward distribution failed.")
        }

        return payoutResult
      })

      setLocalCompletions(prev => [...prev, { milestoneId, enrollee: target, completed: true }])
      addToast("Completion verified and reward paid out.", "success")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed"
      addToast(message, "error")
    } finally {
      setActiveMilestoneTxId(null)
    }
  }

  const handleRemoveEnrollee = async (enrollee: string) => {
    try {
      await removeEnrolleeTx.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 250))
      })
      setLocalEnrollees(prev => prev.filter(value => value !== enrollee))
      addToast("Enrollee removed from local view.", "info")
    } catch {
      addToast("Could not remove enrollee.", "error")
    }
  }

  const enrolleesCount = useCountUp(localEnrollees.length, 400, statsInView)
  const milestonesCount = useCountUp(milestones.length, 400, statsInView)
  const poolBalanceCount = useCountUp(poolBalance, 800, statsInView)
  const totalRewardCount = useCountUp(totalReward, 800, statsInView)

  if (questLoading) {
    return (
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="mb-6 h-9 w-40 animate-pulse bg-muted border-[2px] border-black" />
        <div className="mb-8 h-40 animate-pulse bg-muted border-[3px] border-black shadow-[6px_6px_0_#000]" />
        <SkeletonStatsRow className="mb-8" />
        <SkeletonMilestoneList count={3} />
      </div>
    )
  }

  if (!ws) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="mb-4 text-2xl font-black">Quest not found</h2>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <QuestMetadata questId={questId} questName={ws.name} questDescription={ws.description} />
      {/* Background */}
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
      >
        <div className="border-border bg-background neo-press group-hover:bg-primary flex h-7 w-7 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)] transition-colors hover:shadow-[3px_3px_0_var(--color-border)] active:shadow-[1px_1px_0_var(--color-border)]">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Quest header card */}
      <div className="bg-background border-border animate-fade-in-up relative mb-8 overflow-hidden border-[3px] shadow-[6px_6px_0_var(--color-border)]">
        {/* Header bar */}
        <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-wider uppercase">Quest Details</span>
            {isComplete && (
              <Badge variant="success" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-success border-border h-2.5 w-2.5 border" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="relative p-6">
          <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">{ws.name}</h1>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">{ws.description}</p>
            </div>
            <div className="flex flex-shrink-0 gap-3">
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shimmer-on-hover"
                  onClick={() => setShowAddEnrollee(!showAddEnrollee)}
                >
                  <UserPlus className="h-4 w-4" />
                  Add Enrollee
                </Button>
              )}
              <Button
                size="sm"
                className="shimmer-on-hover"
                onClick={() => setShowMilestoneForm(true)}
              >
                <Plus className="h-4 w-4" />
                Add Milestone
              </Button>
              <ShareButton questId={questId} questName={ws.name} onToast={addToast} />
            </div>
          </div>
        </div>
      </div>

      {/* Add Enrollee inline panel */}
      {showAddEnrollee && (
        <form
          onSubmit={enrolleeForm.handleSubmit(handleAddEnrollee)}
          className="animate-fade-in-up bg-background border-border mb-8 border-[3px] shadow-[4px_4px_0_var(--color-border)]"
        >
          <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-5 py-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="text-sm font-black tracking-wider uppercase">Add Enrollee</span>
            </div>
            <button
              type="button"
              onClick={closeAddEnrollee}
              disabled={addPhase === "submitting"}
              className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border-[2px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <FormLabel required>Stellar Address</FormLabel>
              <input
                {...enrolleeForm.register("address")}
                placeholder="G..."
                disabled={addPhase === "submitting" || addPhase === "done"}
                className={cn(
                  "border-border bg-background w-full border-[2px] px-4 py-2.5 font-mono text-sm font-medium transition-shadow focus:shadow-[3px_3px_0_var(--color-border)] focus:outline-none disabled:opacity-50",
                  enrolleeForm.formState.errors.address && "border-destructive"
                )}
              />
              <FieldError message={enrolleeForm.formState.errors.address?.message} />
            </div>
            {!isSupportedNetwork && (
              <p className="text-destructive text-xs font-bold">
                Switch Freighter to Testnet to continue.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={addEnrolleeTx.isPending || addPhase === "done" || !isSupportedNetwork}
                className="shimmer-on-hover"
              >
                {addEnrolleeTx.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : addPhase === "done" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Added!
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Enrollee
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={closeAddEnrollee}
                disabled={addEnrolleeTx.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Stats row */}
      <div ref={statsRef} className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            icon: Users,
            label: "Enrollees",
            value: enrolleesCount,
            bg: "bg-primary",
          },
          {
            icon: Target,
            label: "Milestones",
            value: milestonesCount,
            bg: "bg-primary",
          },
          {
            icon: Coins,
            label: "Pool Balance",
            value: formatTokens(poolBalanceCount),
            bg: "bg-primary",
          },
          {
            icon: Coins,
            label: "Total Rewards",
            value: formatTokens(totalRewardCount),
            bg: "bg-success",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`reveal-up ${statsInView ? "in-view" : ""}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <Card className="neo-lift hover:shadow-[7px_7px_0_var(--color-border)] active:shadow-[2px_2px_0_var(--color-border)]">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`h-10 w-10 ${stat.bg} border-border flex flex-shrink-0 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)]`}
                >
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold">{stat.label}</p>
                  <p className="text-lg font-black tabular-nums">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Progress section */}
      {milestones.length > 0 && (
        <div className="animate-fade-in-up stagger-3 mb-8 space-y-3">
          {/* Milestone completion progress */}
          <div className="bg-background border-border border-[3px] p-5 shadow-[4px_4px_0_var(--color-border)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black">Overall Progress</span>
              <div className="flex items-center gap-3">
                {earnedReward > 0 && (
                  <span className="text-xs font-bold text-green-700">
                    +{formatTokens(earnedReward)} USDC earned
                  </span>
                )}
                <span className="text-sm font-black">
                  {completedMilestones}/{milestones.length}
                </span>
              </div>
            </div>
            <Progress value={completedMilestones} max={milestones.length} />
          </div>

          {/* Funding progress */}
          {totalReward > 0 && (
            <div className="bg-background border-border border-[3px] p-5 shadow-[4px_4px_0_var(--color-border)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-black">Reward Pool Funding</span>
                <div className="flex items-center gap-2">
                  {poolBalance < totalReward ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Underfunded
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Fully funded
                    </span>
                  )}
                  <span className="text-sm font-black tabular-nums">
                    {formatTokens(poolBalance)} / {formatTokens(totalReward)} USDC
                  </span>
                </div>
              </div>
              <Progress value={poolBalance} max={totalReward} />
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-border mb-6 flex gap-0 border-b-[3px]" ref={contentRef}>
        {(["milestones", "enrollees"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-[3px] cursor-pointer border-[3px] border-b-0 px-6 py-3 text-sm font-black tracking-wider capitalize uppercase transition-all ${
              activeTab === tab
                ? "border-border bg-primary shadow-[2px_-2px_0_var(--color-border)]"
                : "hover:bg-secondary border-transparent"
            }`}
          >
            {tab}
            <span className="ml-2 text-xs opacity-60">
              ({tab === "milestones" ? milestones.length : localEnrollees.length})
            </span>
          </button>
        ))}
      </div>

      {/* Add Milestone form */}
      {showMilestoneForm && (
        <form
          onSubmit={milestoneForm.handleSubmit(handleCreateMilestone)}
          className="animate-fade-in-up mb-6"
        >
          <Card>
            <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-5 py-2.5">
              <span className="text-xs font-black tracking-wider uppercase">New Milestone</span>
              <button
                type="button"
                onClick={resetMilestoneForm}
                className="flex h-5 w-5 cursor-pointer items-center justify-center transition-opacity hover:opacity-70"
                aria-label="Close form"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <CardContent className="space-y-4 p-5">
              <div>
                <FormLabel required>Title</FormLabel>
                <input
                  {...milestoneForm.register("title")}
                  type="text"
                  placeholder="e.g. Complete Module 1"
                  maxLength={100}
                  className={cn(
                    "border-border bg-background w-full border-[2px] px-3 py-2 text-sm font-bold shadow-[2px_2px_0_var(--color-border)] transition-shadow outline-none focus:shadow-[3px_3px_0_var(--color-border)]",
                    milestoneForm.formState.errors.title && "border-destructive"
                  )}
                  disabled={createMilestoneTx.isPending}
                />
                <FieldError message={milestoneForm.formState.errors.title?.message} />
              </div>
              <div>
                <FormLabel required>Description</FormLabel>
                <textarea
                  {...milestoneForm.register("description")}
                  placeholder="Describe what the learner needs to accomplish..."
                  rows={3}
                  maxLength={500}
                  className={cn(
                    "border-border bg-background w-full resize-none border-[2px] px-3 py-2 text-sm font-bold shadow-[2px_2px_0_var(--color-border)] transition-shadow outline-none focus:shadow-[3px_3px_0_var(--color-border)]",
                    milestoneForm.formState.errors.description && "border-destructive"
                  )}
                  disabled={createMilestoneTx.isPending}
                />
                <FieldError message={milestoneForm.formState.errors.description?.message} />
              </div>
              <div>
                <FormLabel required>Reward (tokens)</FormLabel>
                <input
                  {...milestoneForm.register("rewardAmount")}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="100"
                  className={cn(
                    "border-border bg-background w-full border-[2px] px-3 py-2 text-sm font-bold shadow-[2px_2px_0_var(--color-border)] transition-shadow outline-none focus:shadow-[3px_3px_0_var(--color-border)]",
                    milestoneForm.formState.errors.rewardAmount && "border-destructive"
                  )}
                  disabled={createMilestoneTx.isPending}
                />
                <FieldError message={milestoneForm.formState.errors.rewardAmount?.message} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMilestoneTx.isPending}
                  className="shimmer-on-hover"
                >
                  {createMilestoneTx.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Milestone
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={resetMilestoneForm}
                  disabled={createMilestoneTx.isPending}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Milestones tab */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {questLoading ? (
            <SkeletonMilestoneList count={3} />
          ) : milestones.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-primary border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">No milestones yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Add milestones to define learning goals.
                </p>
                <Button
                  size="sm"
                  className="shimmer-on-hover"
                  onClick={() => setShowMilestoneForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Milestone
                </Button>
              </CardContent>
            </Card>
          ) : (
            milestones.map((ms, i) => {
              const msReward = Number(ms.rewardAmount ?? ms.reward_amount ?? 0)
              const isCompleted = localCompletions.some(c => c.milestoneId === ms.id && c.completed)
              const completedBy = localCompletions
                .filter(c => c.milestoneId === ms.id && c.completed)
                .map(c => c.enrollee)
              const isExpanded = expandedMilestone === ms.id
              const isVerifying = verifyPayoutTx.isPending && activeMilestoneTxId === ms.id

              return (
                <div
                  key={ms.id}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <button
                    type="button"
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} milestone ${ms.title}`}
                    onClick={() => setExpandedMilestone(isExpanded ? null : ms.id)}
                    className="focus-visible:ring-ring w-full text-left focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Card
                      className={`neo-lift group cursor-pointer transition-all hover:shadow-[7px_7px_0_var(--color-border)] active:shadow-[2px_2px_0_var(--color-border)] ${
                        isCompleted ? "border-success" : ""
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className={`border-border mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)] transition-all duration-300 ${
                              isCompleted ? "bg-success" : "bg-background group-hover:bg-secondary"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="text-muted-foreground h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <h3
                                className={`font-black ${isCompleted ? "text-muted-foreground" : ""}`}
                              >
                                {ms.title}
                              </h3>
                              <div className="flex flex-shrink-0 items-center gap-2">
                                <Badge variant={isCompleted ? "success" : "default"}>
                                  {msReward} USDC
                                </Badge>
                                {isExpanded ? (
                                  <ChevronUp className="text-muted-foreground h-4 w-4" />
                                ) : (
                                  <ChevronDown className="text-muted-foreground h-4 w-4" />
                                )}
                              </div>
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="animate-fade-in-up mt-3">
                                <p className="text-muted-foreground mb-3 text-sm">
                                  {ms.description}
                                </p>
                                {completedBy.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-muted-foreground mb-2 text-xs font-bold">
                                      Completed by:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {completedBy.map(addr => (
                                        <span
                                          key={addr}
                                          className="bg-success/10 border-border border-[1.5px] px-2 py-1 font-mono text-xs font-bold shadow-[1px_1px_0_var(--color-border)]"
                                        >
                                          {addr}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {!isCompleted && localEnrollees.length > 0 && (
                                  <Button
                                    variant={verifyPayoutTx.isFailure ? "danger" : "outline"}
                                    size="sm"
                                    className="shimmer-on-hover"
                                    disabled={isVerifying || !isOwner || !isSupportedNetwork}
                                    onClick={e => {
                                      e.stopPropagation()
                                      void handleVerifyAndPayout(ms.id, msReward)
                                    }}
                                  >
                                    {isVerifying ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Verifying & Paying...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Verify & Payout
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Enrollees tab */}
      {activeTab === "enrollees" && (
        <div className="space-y-4">
          {questLoading ? (
            <SkeletonEnrolleeList count={3} />
          ) : localEnrollees.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-primary border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">No enrollees yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">Add learners to this quest.</p>
                {isOwner && (
                  <Button
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={() => setShowAddEnrollee(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Enrollee
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            localEnrollees.map((addr, i) => {
              const completed = localCompletions.filter(
                c => c.enrollee === addr && c.completed
              ).length
              const earned = milestones
                .filter(m =>
                  localCompletions.some(
                    c => c.enrollee === addr && c.milestoneId === m.id && c.completed
                  )
                )
                .reduce((sum, m) => sum + Number(m.rewardAmount ?? m.reward_amount ?? 0), 0)
              const isAllDone = completed === milestones.length && milestones.length > 0

              return (
                <div
                  key={addr}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <Card className="neo-lift group hover:shadow-[7px_7px_0_var(--color-border)] active:shadow-[2px_2px_0_var(--color-border)]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary border-border flex h-10 w-10 items-center justify-center border-[2px] font-mono text-sm font-black shadow-[2px_2px_0_var(--color-border)] transition-shadow group-hover:shadow-[3px_3px_0_var(--color-border)]">
                            {addr.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-bold">{addr}</p>
                              {isAllDone && <Sparkles className="text-primary h-3.5 w-3.5" />}
                            </div>
                            <p className="text-muted-foreground text-xs font-bold">
                              {completed}/{milestones.length} milestones
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="success" className="tabular-nums">
                            +{formatTokens(earned)} USDC
                          </Badge>
                          <p className="text-muted-foreground mt-1 text-xs font-bold">earned</p>
                        </div>
                      </div>
                      {isOwner && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={removeEnrolleeTx.isPending}
                            onClick={() => void handleRemoveEnrollee(addr)}
                          >
                            {removeEnrolleeTx.isPending ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              "Remove"
                            )}
                          </Button>
                        </div>
                      )}
                      {milestones.length > 0 && (
                        <Progress value={completed} max={milestones.length} className="mt-4" />
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })
          )}
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
