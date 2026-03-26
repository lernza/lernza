import { useState, useCallback, useEffect } from "react"
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
  Download,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FieldError, FormLabel } from "@/components/ui/form-field"
import { cn, formatTokens } from "@/lib/utils"
import { useInView, useCountUp } from "@/hooks/use-animations"
// Mock data removed in favor of contract state
import { useToast } from "@/hooks/use-toast"
import { ToastContainer } from "@/components/toast"
import { ShareButton } from "@/components/share-button"
import { QuestMetadata } from "@/components/quest-metadata"
import {
  TransactionConfirmDialog,
  type TransactionDetails,
} from "@/components/transaction-confirm-dialog"
import { useWallet } from "@/hooks/use-wallet"
import { questClient, type QuestInfo } from "@/lib/contracts/quest"
import { milestoneClient, type MilestoneInfo } from "@/lib/contracts/milestone"
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

// milestoneClient is now imported as a singleton instance from the module

// Helper function to truncate addresses
const truncateAddress = (address: string) => {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function QuestView() {
  const { id } = useParams()
  const questId = Number(id)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>("milestones")
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null)
  const [showAddEnrollee, setShowAddEnrollee] = useState(false)
  const [addPhase, setAddPhase] = useState<"idle" | "submitting" | "done" | "error">("idle")

  const [ws, setWs] = useState<QuestInfo | null>(null)
  const [milestones, setMilestones] = useState<MilestoneInfo[]>([])
  const [localEnrollees, setLocalEnrollees] = useState<string[]>([])
  const [poolBalance, setPoolBalance] = useState<bigint>(0n)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localCompletions, setLocalCompletions] = useState<
    { milestoneId: number; enrollee: string; completed: boolean }[]
  >([])

  const { toasts, addToast, removeToast } = useToast()
  const { address, isSupportedNetwork } = useWallet()
  const isOwner = !!address && address === ws?.owner

  const fetchQuestData = useCallback(async () => {
    if (!questId && questId !== 0) return
    setIsLoading(true)
    setError(null)
    try {
      const [q, m, e, b] = await Promise.all([
        questClient.getQuest(questId),
        milestoneClient.getMilestones(questId),
        questClient.getEnrollees(questId),
        rewardsClient.getPoolBalance(questId),
      ])

      if (!q) {
        setError("Quest not found")
        return
      }

      setWs(q)
      setMilestones(m)
      setLocalEnrollees(e)
      setPoolBalance(b)

      // Fetch completions for the current user if connected
      if (address) {
        const completions = await Promise.all(
          m.map(async milestone => {
            const completed = await milestoneClient.isCompleted(questId, milestone.id, address)
            return { milestoneId: milestone.id, enrollee: address, completed }
          })
        )
        setLocalCompletions(completions)
      }
    } catch (err: unknown) {
      console.error("Failed to fetch quest data:", err)
      setError("Failed to load quest data from contract.")
    } finally {
      setIsLoading(false)
    }
  }, [questId, address])

  useEffect(() => {
    void fetchQuestData()
  }, [fetchQuestData])

  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const addEnrolleeTx = useTransactionAction()
  const createMilestoneTx = useTransactionAction()
  const verifyPayoutTx = useTransactionAction()
  const removeEnrolleeTx = useTransactionAction()
  const [activeMilestoneTxId, setActiveMilestoneTxId] = useState<number | null>(null)

  // Transaction confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingTransaction, setPendingTransaction] = useState<{
    type: "add_enrollee" | "create_milestone" | "verify_payout"
    details: TransactionDetails
    execute: () => Promise<void>
  } | null>(null)

  // Import quest state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedData, setImportedData] = useState<{
    name: string
    description: string
    milestones: Array<{ title: string; description: string; rewardAmount: number }>
  } | null>(null)

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

      // Show confirmation dialog instead of executing directly
      setPendingTransaction({
        type: "create_milestone",
        details: {
          actionName: "Create Milestone",
          fromAddress: address,
          estimatedFee: "0.002",
          tokenAmount: BigInt(reward),
          tokenSymbol: "USDC",
          description: `Create milestone "${values.title}" with ${reward} USDC reward.`,
        },
        execute: async () => {
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
      })
      setShowConfirmDialog(true)
    },
    [address, questId, addToast, resetMilestoneForm, createMilestoneTx]
  )

  const [statsRef, statsInView] = useInView()
  const [contentRef, contentInView] = useInView()

  const totalReward = milestones.reduce(
    (sum: number, m: MilestoneInfo) => sum + Number(m.rewardAmount),
    0
  )
  type Completion = { milestoneId: number; enrollee: string; completed: boolean }
  const completedMilestones = new Set(
    localCompletions.filter((c: Completion) => c.completed).map((c: Completion) => c.milestoneId)
  ).size
  const isComplete = completedMilestones === milestones.length && milestones.length > 0
  const earnedReward = milestones
    .filter((m: MilestoneInfo) =>
      localCompletions.some((c: Completion) => c.milestoneId === m.id && c.completed)
    )
    .reduce((sum: number, m: MilestoneInfo) => sum + Number(m.rewardAmount), 0)

  const closeAddEnrollee = useCallback(() => {
    setShowAddEnrollee(false)
    enrolleeForm.reset()
    addEnrolleeTx.reset()
    setAddPhase("idle")
  }, [enrolleeForm, addEnrolleeTx])

  const handleAddEnrollee = useCallback(
    async (values: EnrolleeFormValues) => {
      if (!address) return

      // Show confirmation dialog instead of executing directly
      setPendingTransaction({
        type: "add_enrollee",
        details: {
          actionName: "Add Enrollee",
          fromAddress: address,
          toAddress: values.address,
          estimatedFee: "0.001",
          description: `Add ${truncateAddress(values.address)} as an enrollee to this quest.`,
        },
        execute: async () => {
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
            const message =
              err instanceof Error ? err.message : "Transaction failed. Please try again."
            setAddPhase("error")
            enrolleeForm.setError("address", { message })
          }
        },
      })
      setShowConfirmDialog(true)
    },
    [address, questId, addToast, closeAddEnrollee, addEnrolleeTx, enrolleeForm, fetchQuestData]
  )

  const handleVerifyAndPayout = async (milestoneId: number, rewardAmount: bigint) => {
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

    // Show confirmation dialog instead of executing directly
    setPendingTransaction({
      type: "verify_payout",
      details: {
        actionName: "Verify & Payout",
        fromAddress: address,
        toAddress: target,
        estimatedFee: "0.003",
        tokenAmount: BigInt(rewardAmount),
        tokenSymbol: "USDC",
        description: `Verify completion and distribute ${rewardAmount} USDC to ${truncateAddress(target)}.`,
      },
      execute: async () => {
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
      },
    })
    setShowConfirmDialog(true)
  }

  const handleRemoveEnrollee = async (enrollee: string) => {
    try {
      await removeEnrolleeTx.run(async () => {
        // Mock remove for now as contract doesn't have it
        await new Promise(resolve => setTimeout(resolve, 250))
      })
      setLocalEnrollees(prev => prev.filter(value => value !== enrollee))
      addToast("Enrollee removed from local view.", "info")
    } catch {
      addToast("Could not remove enrollee.", "error")
    }
  }

  // Export quest functionality
  const handleExportQuest = useCallback(() => {
    if (!ws) return

    const exportData = {
      name: ws.name,
      description: ws.description,
      milestones: milestones.map(ms => ({
        title: ms.title,
        description: ms.description,
        rewardAmount: ms.rewardAmount,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${ws.name.toLowerCase().replace(/\s+/g, "-")}-quest-template.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    addToast("Quest exported successfully!", "success")
  }, [ws, milestones, addToast])

  // Import quest functionality
  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        // Validate schema using Zod
        const importSchema = z.object({
          name: z.string().min(1, "Name is required").max(64, "Max 64 characters"),
          description: z
            .string()
            .min(1, "Description is required")
            .max(2000, "Max 2000 characters"),
          milestones: z
            .array(
              z.object({
                title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
                description: z
                  .string()
                  .min(1, "Description is required")
                  .max(500, "Max 500 characters"),
                rewardAmount: z.number().positive("Must be greater than 0"),
              })
            )
            .min(1, "At least one milestone is required"),
        })

        const validated = importSchema.parse(data)
        setImportedData(validated)
        setShowImportDialog(true)
      } catch (err: unknown) {
        if (err instanceof z.ZodError) {
          const messages = err.issues.map(e => e.message).join(", ")
          addToast(`Invalid JSON: ${messages}`, "error")
        } else if (err instanceof SyntaxError) {
          addToast("Invalid JSON format. Please check the file.", "error")
        } else {
          const message = err instanceof Error ? err.message : "Unknown error"
          addToast(`Failed to import quest: ${message}`, "error")
        }
      } finally {
        // Reset file input
        event.target.value = ""
      }
    },
    [addToast]
  )

  const handleConfirmImport = useCallback(() => {
    if (!importedData) return

    // Navigate to create-quest page with imported data in localStorage
    localStorage.setItem("lernza:imported-quest", JSON.stringify(importedData))
    navigate("/create-quest")
    setShowImportDialog(false)
    setImportedData(null)
    addToast("Quest data loaded. Complete the creation process.", "success")
  }, [importedData, navigate, addToast])

  const enrolleesCount = useCountUp(localEnrollees.length, 400, statsInView)
  const milestonesCount = useCountUp(milestones.length, 400, statsInView)
  const poolBalanceDisplayCount = useCountUp(Number(poolBalance), 800, statsInView)
  const totalRewardCount = useCountUp(totalReward, 800, statsInView)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
        <h2 className="text-2xl font-black">Loading Quest...</h2>
        <p className="text-muted-foreground mt-2 font-bold">Fetching contract state from Stellar</p>
      </div>
    )
  }

  if (error || !ws) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <div className="bg-destructive/10 border-destructive mx-auto mb-6 flex h-16 w-16 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-destructive)]">
          <X className="text-destructive h-8 w-8" />
        </div>
        <h2 className="mb-2 text-2xl font-black">{error || "Quest not found"}</h2>
        <p className="text-muted-foreground mb-8 font-bold">
          We couldn't resolve the quest details.
        </p>
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
            <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:gap-3">
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={handleExportQuest}
                  >
                    <Download className="h-4 w-4" />
                    Export Quest
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shimmer-on-hover cursor-pointer"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[type="file"]'
                        ) as HTMLInputElement
                        input?.click()
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Import Quest
                    </Button>
                  </label>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="shimmer-on-hover"
                onClick={() => setShowAddEnrollee(!showAddEnrollee)}
              >
                <UserPlus className="h-4 w-4" />
                Add Enrollee
              </Button>
              <Button
                size="sm"
                className="flex-1 shrink-0 px-2 sm:flex-none sm:px-3"
                onClick={() => setShowMilestoneForm(true)}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">Add Milestone</span>
              </Button>
              <ShareButton
                questId={questId}
                questName={ws.name}
                onToast={addToast}
                className="flex-1 sm:flex-none"
              />
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
            value: formatTokens(poolBalanceDisplayCount),
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
        <div className="animate-fade-in-up stagger-3 mb-8">
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
        </div>
      )}

      {/* Tabs */}
      <div className="border-border mb-6 flex gap-0 border-b-[3px]" ref={contentRef}>
        {(["milestones", "enrollees"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-[3px] cursor-pointer border-[3px] border-b-0 px-6 py-3 text-sm font-black tracking-wider uppercase transition-all ${
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
          {milestones.length === 0 ? (
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
                                  {formatTokens(Number(ms.rewardAmount))} USDC
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
                                      void handleVerifyAndPayout(ms.id, ms.rewardAmount)
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
          {localEnrollees.length === 0 ? (
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
            localEnrollees.map((addr: string, i: number) => {
              type Completion = { milestoneId: number; enrollee: string; completed: boolean }
              const completed = localCompletions.filter(
                (c: Completion) => c.enrollee === addr && c.completed
              ).length
              const earned = milestones
                .filter((m: MilestoneInfo) =>
                  localCompletions.some(
                    (c: Completion) => c.enrollee === addr && c.milestoneId === m.id && c.completed
                  )
                )
                .reduce((sum: number, m: MilestoneInfo) => sum + Number(m.rewardAmount), 0)
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

      {/* Transaction Confirmation Dialog */}
      <TransactionConfirmDialog
        isOpen={showConfirmDialog}
        details={pendingTransaction?.details ?? null}
        onConfirm={() => {
          setShowConfirmDialog(false)
          if (pendingTransaction) {
            pendingTransaction.execute()
          }
        }}
        onCancel={() => {
          setShowConfirmDialog(false)
          setPendingTransaction(null)
        }}
        isPending={
          addEnrolleeTx.isPending || createMilestoneTx.isPending || verifyPayoutTx.isPending
        }
      />

      {/* Import Quest Dialog */}
      {showImportDialog && importedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowImportDialog(false)
              setImportedData(null)
            }}
          />
          <div className="animate-fade-in-up relative z-10 w-full max-w-md px-4">
            <Card className="border-border overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
              <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-4">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm font-black tracking-wider uppercase">Import Quest</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportDialog(false)
                    setImportedData(null)
                  }}
                  className="border-border bg-background hover:bg-secondary neo-press flex h-6 w-6 cursor-pointer items-center justify-center border-[2px]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Quest Name
                  </p>
                  <p className="mt-1 text-lg font-black">{importedData.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Description
                  </p>
                  <p className="mt-1 text-sm">{importedData.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Milestones
                  </p>
                  <div className="mt-1 space-y-2">
                    {importedData.milestones.map((ms, i) => (
                      <div key={i} className="bg-muted/50 rounded-md p-2">
                        <p className="text-sm font-bold">{ms.title}</p>
                        <p className="text-muted-foreground text-xs">{ms.description}</p>
                        <p className="text-primary mt-1 text-xs font-black">
                          {formatTokens(ms.rewardAmount)} USDC
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportDialog(false)
                      setImportedData(null)
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmImport} className="shimmer-on-hover flex-1">
                    <Upload className="h-4 w-4" />
                    Import & Create Quest
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
