import { useCallback, useState, useEffect, type ChangeEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Coins,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Target,
  UserPlus,
  Users,
  X,
  Download,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FieldError, FormLabel } from "@/components/ui/form-field"
import { ErrorState } from "@/components/ui/async-states"
import { Skeleton, SkeletonMilestoneList, SkeletonStatsRow } from "@/components/ui/skeleton"
import { cn, formatTokens } from "@/lib/utils"
import { useInView, useCountUp } from "@/hooks/use-animations"
import { useToast } from "@/hooks/use-toast"
import { ToastContainer } from "@/components/toast"
import { ShareButton } from "@/components/share-button"
import { QuestMetadata } from "@/components/quest-metadata"
import {
  TransactionConfirmDialog,
  type TransactionDetails,
} from "@/components/transaction-confirm-dialog"
import { useWallet } from "@/hooks/use-wallet"
import { useQuest, useMilestones, useEnrollees, useRewardPool } from "@/hooks/use-quest-data"
import { questClient, Visibility } from "@/lib/contracts/quest"
import { milestoneClient, type MilestoneInfo } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"
import { useTransactionAction } from "@/hooks/use-transaction-action"

const milestoneFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Max 500 characters"),
  rewardAmount: z
    .string()
    .min(1, "Reward amount is required")
    .refine(v => Number.isFinite(Number(v)) && Number(v) >= 0, "Must be a non-negative number"),
  requiresPrevious: z.boolean().default(false),
})
type MilestoneFormValues = z.infer<typeof milestoneFormSchema>
type MilestoneFormInput = z.input<typeof milestoneFormSchema>

const enrolleeFormSchema = z.object({
  address: z
    .string()
    .min(1, "Stellar address is required")
    .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key (starts with G)"),
})
type EnrolleeFormValues = z.infer<typeof enrolleeFormSchema>

type Tab = "milestones" | "enrollees"

interface CompletionRecord {
  milestoneId: number
  enrollee: string
  completed: true
}

const EMPTY_MILESTONES: MilestoneInfo[] = []
const EMPTY_ENROLLEES: string[] = []
const EMPTY_COMPLETIONS: CompletionRecord[] = []

const QUEST_ERROR_MESSAGES: Record<number, string> = {
  4: "You are already enrolled in this quest.",
  7: "This quest is already full.",
  8: "This quest is archived and no longer accepts new learners.",
  11: "This quest is invite only.",
}

const MILESTONE_ERROR_MESSAGES: Record<number, string> = {
  12: "This learner is not enrolled in the quest.",
  14: "Complete previous milestone first.",
}

function getContractErrorCode(message: string): number | null {
  const match = message.match(/Error\(Contract, #(\d+)\)/)
  return match ? Number(match[1]) : null
}

function mapContractError(message: string, knownMessages: Record<number, string>): string {
  const code = getContractErrorCode(message)
  return code && knownMessages[code] ? knownMessages[code] : message
}

function toSafeNumber(value: bigint): number {
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(value)
}

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
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [activeMilestoneTxId, setActiveMilestoneTxId] = useState<number | null>(null)

  const { toasts, addToast, removeToast } = useToast()
  const { address, isSupportedNetwork } = useWallet()

  const addEnrolleeTx = useTransactionAction()
  const enrollTx = useTransactionAction()
  const createMilestoneTx = useTransactionAction()
  const verifyPayoutTx = useTransactionAction()
  const removeEnrolleeTx = useTransactionAction()

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
    milestones: Array<{
      title: string
      description: string
      rewardAmount: number
      requiresPrevious: boolean
    }>
  } | null>(null)

  const milestoneForm = useForm<MilestoneFormInput, undefined, MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: { title: "", description: "", rewardAmount: "", requiresPrevious: false },
  })

  const enrolleeForm = useForm<EnrolleeFormValues>({
    resolver: zodResolver(enrolleeFormSchema),
    defaultValues: { address: "" },
  })

  // Use individual hooks for quest data
  const questData = useQuest(questId)
  const milestonesData = useMilestones(questId)
  const enrolleesData = useEnrollees(questId)
  const poolBalanceData = useRewardPool(questId)

  // Combined loading state
  const isLoading =
    questData.isLoading ||
    milestonesData.isLoading ||
    enrolleesData.isLoading ||
    poolBalanceData.isLoading

  // Use the first error that exists
  const loadError =
    questData.error || milestonesData.error || enrolleesData.error || poolBalanceData.error

  // Refetch function that refreshes all data
  const refetch = useCallback(async () => {
    await Promise.all([
      questData.refetch(),
      milestonesData.refetch(),
      enrolleesData.refetch(),
      poolBalanceData.refetch(),
    ])
  }, [questData.refetch, milestonesData.refetch, enrolleesData.refetch, poolBalanceData.refetch])

  // Get raw data
  const quest = questData.data
  const milestones = milestonesData.data ?? EMPTY_MILESTONES
  const enrollees = enrolleesData.data ?? EMPTY_ENROLLEES
  const poolBalance = poolBalanceData.data ?? BigInt(0)

  // Completions data - needs to be fetched separately since it depends on both milestones and enrollees
  const [completions, setCompletions] = useState<CompletionRecord[]>(EMPTY_COMPLETIONS)

  // Fetch completions when milestones and enrollees are available
  useEffect(() => {
    const fetchCompletions = async () => {
      if (milestones.length > 0 && enrollees.length > 0) {
        try {
          const completionEntries = await Promise.all(
            enrollees.flatMap(enrollee =>
              milestones.map(async milestone => {
                const completed = await milestoneClient.isCompleted(questId, milestone.id, enrollee)
                return completed
                  ? ({
                      milestoneId: milestone.id,
                      enrollee,
                      completed: true,
                    } satisfies CompletionRecord)
                  : null
              })
            )
          )

          const filteredCompletions = completionEntries.filter(
            (entry): entry is CompletionRecord => entry !== null
          )
          setCompletions(filteredCompletions)
        } catch (error) {
          console.error("Failed to fetch completions:", error)
        }
      } else {
        setCompletions(EMPTY_COMPLETIONS)
      }
    }

    fetchCompletions()
  }, [
    questId,
    milestones,
    enrollees,
    milestoneClient,
    questData,
    milestonesData,
    enrolleesData,
    poolBalanceData,
  ])

  const isOwner = !!address && quest?.owner === address
  const isEnrolled = !!address && enrollees.includes(address)

  const viewerCompletedMilestoneIds = new Set(
    completions
      .filter(completion => completion.enrollee === address)
      .map(completion => completion.milestoneId)
  )
  const completedMilestones = isOwner
    ? new Set(completions.map(completion => completion.milestoneId)).size
    : viewerCompletedMilestoneIds.size
  const earnedReward = isOwner
    ? 0
    : milestones
        .filter(milestone => viewerCompletedMilestoneIds.has(milestone.id))
        .reduce((sum, milestone) => sum + toSafeNumber(milestone.rewardAmount), 0)

  const totalReward = milestones.reduce(
    (sum, milestone) => sum + toSafeNumber(milestone.rewardAmount),
    0
  )
  const isComplete = completedMilestones === milestones.length && milestones.length > 0

  const [statsRef, statsInView] = useInView()
  const [contentRef, contentInView] = useInView()

  const enrolleesCount = useCountUp(enrollees.length, 400, statsInView)
  const milestonesCount = useCountUp(milestones.length, 400, statsInView)
  const poolBalanceCount = useCountUp(toSafeNumber(poolBalance), 800, statsInView)
  const totalRewardCount = useCountUp(totalReward, 800, statsInView)

  const resetMilestoneForm = useCallback(() => {
    milestoneForm.reset()
    setShowMilestoneForm(false)
  }, [milestoneForm])

  const closeAddEnrollee = useCallback(() => {
    setShowAddEnrollee(false)
    enrolleeForm.reset()
    addEnrolleeTx.reset()
    setAddPhase("idle")
  }, [addEnrolleeTx, enrolleeForm])

  const isMilestoneCompletedBy = useCallback(
    (milestoneId: number, enrollee: string) =>
      completions.some(
        completion =>
          completion.completed &&
          completion.milestoneId === milestoneId &&
          completion.enrollee === enrollee
      ),
    [completions]
  )

  const isMilestoneUnlockedForEnrollee = useCallback(
    (milestone: MilestoneInfo, enrollee: string) =>
      !milestone.requiresPrevious ||
      milestone.id === 0 ||
      isMilestoneCompletedBy(milestone.id - 1, enrollee),
    [isMilestoneCompletedBy]
  )

  const getEligibleEnrollees = useCallback(
    (milestone: MilestoneInfo) =>
      enrollees.filter(
        enrollee =>
          !isMilestoneCompletedBy(milestone.id, enrollee) &&
          isMilestoneUnlockedForEnrollee(milestone, enrollee)
      ),
    [enrollees, isMilestoneCompletedBy, isMilestoneUnlockedForEnrollee]
  )

  const getQuestErrorMessage = useCallback(
    (message: string) => mapContractError(message, QUEST_ERROR_MESSAGES),
    []
  )

  const getMilestoneErrorMessage = useCallback(
    (message: string) => mapContractError(message, MILESTONE_ERROR_MESSAGES),
    []
  )

  const handleCreateMilestone = useCallback(
    async (values: MilestoneFormValues) => {
      if (!address) {
        addToast("Connect your wallet first.", "error")
        return
      }

      const reward = Number(values.rewardAmount)

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
                BigInt(reward),
                values.requiresPrevious && milestones.length > 0
              )
              if (result.status !== "SUCCESS") {
                throw new Error(
                  getMilestoneErrorMessage(result.error ?? "Transaction failed. Please try again.")
                )
              }
              return result
            })

            await refetch()
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
    [
      address,
      addToast,
      createMilestoneTx,
      getMilestoneErrorMessage,
      milestones.length,
      questId,
      refetch,
      resetMilestoneForm,
    ]
  )

  const handleAddEnrollee = useCallback(
    async (values: EnrolleeFormValues) => {
      if (!address) {
        addToast("Connect your wallet first.", "error")
        return
      }

      setAddPhase("submitting")
      try {
        await addEnrolleeTx.run(async () => {
          const result = await questClient.addEnrollee(address, questId, values.address)
          if (result.status !== "SUCCESS") {
            throw new Error(
              getQuestErrorMessage(result.error ?? "Transaction failed. Please try again.")
            )
          }
          return result
        })

        await refetch()
        setAddPhase("done")
        addToast("Enrollee added successfully.", "success")
        setTimeout(closeAddEnrollee, 1500)
      } catch (err: unknown) {
        setAddPhase("error")
        const message = err instanceof Error ? err.message : "Transaction failed. Please try again."
        enrolleeForm.setError("address", { message })
      }
    },
    [
      address,
      addEnrolleeTx,
      addToast,
      closeAddEnrollee,
      enrolleeForm,
      getQuestErrorMessage,
      questId,
      refetch,
    ]
  )

  const handleEnroll = useCallback(async () => {
    if (!address) {
      addToast("Connect your wallet first.", "error")
      return
    }

    try {
      await enrollTx.run(async () => {
        const result = await questClient.addEnrollee(questId, address)
        if (result.status !== "SUCCESS") {
          throw new Error(getQuestErrorMessage(result.error ?? "Enrollment failed."))
        }
        return result
      })

      await refetch()
      addToast("Enrollment confirmed.", "success")
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? getQuestErrorMessage(err.message)
          : "Enrollment failed. Please try again."
      addToast(message, quest?.visibility === Visibility.Private ? "info" : "error")
    }
  }, [address, addToast, enrollTx, getQuestErrorMessage, quest?.visibility, questId, refetch])

  const handleVerifyAndPayout = useCallback(
    async (milestone: MilestoneInfo) => {
      if (!address) {
        addToast("Connect your wallet first.", "error")
        return
      }

      const eligibleEnrollees = getEligibleEnrollees(milestone)
      const blockedBySequence =
        milestone.requiresPrevious &&
        enrollees.some(
          enrollee =>
            !isMilestoneCompletedBy(milestone.id, enrollee) &&
            !isMilestoneUnlockedForEnrollee(milestone, enrollee)
        )

      if (eligibleEnrollees.length === 0) {
        addToast(
          blockedBySequence
            ? "Complete previous milestone first."
            : "All eligible learners are already verified for this milestone.",
          "info"
        )
        return
      }

      const target = eligibleEnrollees[0]
      setPendingTransaction({
        type: "verify_payout",
        details: {
          actionName: "Verify & Payout",
          fromAddress: address,
          toAddress: target,
          estimatedFee: "0.003",
          tokenAmount: milestone.rewardAmount,
          tokenSymbol: "USDC",
          description: `Verify completion and distribute ${formatTokens(toSafeNumber(milestone.rewardAmount))} USDC to ${truncateAddress(target)}.`,
        },
        execute: async () => {
          setActiveMilestoneTxId(milestone.id)
          try {
            await verifyPayoutTx.run(async () => {
              const verifyResult = await milestoneClient.verifyCompletion(
                address,
                questId,
                milestone.id,
                target
              )
              if (verifyResult.status !== "SUCCESS") {
                throw new Error(
                  getMilestoneErrorMessage(verifyResult.error ?? "Milestone verification failed.")
                )
              }

              const payoutAmount = verifyResult.rewardAmount ?? milestone.rewardAmount
              const payoutResult = await rewardsClient.distributeReward(
                address,
                questId,
                milestone.id,
                target,
                payoutAmount
              )
              if (payoutResult.status !== "SUCCESS") {
                throw new Error(payoutResult.error ?? "Reward distribution failed.")
              }

              return payoutResult
            })

            await refetch()
            addToast("Completion verified and reward paid out.", "success")
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Verification failed."
            addToast(message, "error")
          } finally {
            setActiveMilestoneTxId(null)
          }
        },
      })
      setShowConfirmDialog(true)
    },
    [
      address,
      addToast,
      enrollees,
      getEligibleEnrollees,
      getMilestoneErrorMessage,
      isMilestoneCompletedBy,
      isMilestoneUnlockedForEnrollee,
      questId,
      refetch,
      verifyPayoutTx,
    ]
  )

  const handleRemoveEnrollee = useCallback(
    async (enrollee: string) => {
      if (!address) {
        addToast("Connect your wallet first.", "error")
        return
      }

      try {
        await removeEnrolleeTx.run(async () => {
          const result = await questClient.removeEnrollee(address, questId, enrollee)
          if (result.status !== "SUCCESS") {
            throw new Error(getQuestErrorMessage(result.error ?? "Could not remove enrollee."))
          }
          return result
        })

        await refetch()
        addToast("Enrollee removed successfully.", "success")
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not remove enrollee."
        addToast(message, "error")
      }
    },
    [address, addToast, getQuestErrorMessage, questId, refetch, removeEnrolleeTx]
  )

  const handleExportQuest = useCallback(() => {
    if (!quest) {
      return
    }

    const exportData = {
      name: quest.name,
      description: quest.description,
      milestones: milestones.map(milestone => ({
        title: milestone.title,
        description: milestone.description,
        rewardAmount: toSafeNumber(milestone.rewardAmount),
        requiresPrevious: milestone.requiresPrevious,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `${quest.name.toLowerCase().replace(/\s+/g, "-")}-quest-template.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    addToast("Quest exported successfully!", "success")
  }, [addToast, milestones, quest])

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      try {
        const text = await file.text()
        const data = JSON.parse(text)
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
                requiresPrevious: z.boolean().default(false),
              })
            )
            .min(1, "At least one milestone is required"),
        })

        setImportedData(importSchema.parse(data))
        setShowImportDialog(true)
      } catch (err: unknown) {
        if (err instanceof z.ZodError) {
          const messages = err.issues.map(issue => issue.message).join(", ")
          addToast(`Invalid JSON: ${messages}`, "error")
        } else if (err instanceof SyntaxError) {
          addToast("Invalid JSON format. Please check the file.", "error")
        } else {
          const message = err instanceof Error ? err.message : "Unknown error"
          addToast(`Failed to import quest: ${message}`, "error")
        }
      } finally {
        event.target.value = ""
      }
    },
    [addToast]
  )

  const handleConfirmImport = useCallback(() => {
    if (!importedData) {
      return
    }

    localStorage.setItem("lernza:imported-quest", JSON.stringify(importedData))
    navigate("/create-quest")
    setShowImportDialog(false)
    setImportedData(null)
    addToast("Quest data loaded. Complete the creation process.", "success")
  }, [addToast, importedData, navigate])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-6 h-12 w-96" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        <SkeletonStatsRow className="mb-8" />

        <div className="mb-8">
          <Skeleton className="mb-4 h-6 w-32" />
          <SkeletonMilestoneList count={3} />
        </div>

        <div className="flex justify-center">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <ErrorState message={loadError} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!quest) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <div className="bg-destructive/10 border-destructive mx-auto mb-6 flex h-16 w-16 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-destructive)]">
          <X className="text-destructive h-8 w-8" />
        </div>
        <h2 className="mb-2 text-2xl font-black">{loadError || "Quest not found"}</h2>
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
      <QuestMetadata
        questId={questId}
        questName={quest.name}
        questDescription={quest.description}
      />
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      <button
        onClick={() => navigate("/dashboard")}
        className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
      >
        <div className="border-border bg-background neo-press group-hover:bg-primary flex h-7 w-7 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)] transition-colors hover:shadow-[3px_3px_0_var(--color-border)] active:shadow-[1px_1px_0_var(--color-border)]">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      <div className="bg-background border-border animate-fade-in-up relative mb-8 overflow-hidden border-[3px] shadow-[6px_6px_0_var(--color-border)]">
        <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-wider uppercase">Quest Details</span>
            {isComplete && (
              <Badge variant="success" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
            <Badge variant={quest.visibility === Visibility.Public ? "default" : "outline"}>
              {quest.visibility === Visibility.Public ? "Public" : "Invite Only"}
            </Badge>
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
              <h1 className="text-2xl font-black sm:text-3xl">{quest.name}</h1>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">{quest.description}</p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-3">
              {isOwner ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={handleExportQuest}
                  >
                    <Download className="h-4 w-4" />
                    Export Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={() => document.getElementById("quest-import-file-input")?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Import Template
                  </Button>
                  <input
                    id="quest-import-file-input"
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={event => void handleImportFile(event)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={() => setShowAddEnrollee(current => !current)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Enrollee
                  </Button>
                  <Button
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={() => setShowMilestoneForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Milestone
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="shimmer-on-hover"
                  onClick={() => void handleEnroll()}
                  disabled={enrollTx.isPending || isEnrolled || !isSupportedNetwork || !address}
                  title={
                    !isSupportedNetwork
                      ? "Switch Freighter to Testnet to continue."
                      : quest.visibility === Visibility.Private && !isEnrolled
                        ? "Invite only"
                        : undefined
                  }
                >
                  {enrollTx.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Awaiting Signature...
                    </>
                  ) : isEnrolled ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Already Enrolled
                    </>
                  ) : quest.visibility === Visibility.Private ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Invite Only
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Enroll
                    </>
                  )}
                </Button>
              )}
              <ShareButton questId={questId} questName={quest.name} onToast={addToast} />
            </div>
          </div>
          {!isOwner && quest.visibility === Visibility.Private && !isEnrolled && (
            <p className="text-muted-foreground relative mt-4 text-xs font-bold">
              This quest is invite only. If you try to enroll, the contract will reject it.
            </p>
          )}
        </div>
      </div>

      {showAddEnrollee && isOwner && (
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
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={`reveal-up ${statsInView ? "in-view" : ""}`}
            style={{ transitionDelay: `${index * 100}ms` }}
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

      {milestones.length > 0 && (
        <div className="animate-fade-in-up stagger-3 mb-8">
          <div className="bg-background border-border border-[3px] p-5 shadow-[4px_4px_0_var(--color-border)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black">
                {isOwner ? "Quest Progress" : "Your Progress"}
              </span>
              <div className="flex items-center gap-3">
                {earnedReward > 0 && !isOwner && (
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
              ({tab === "milestones" ? milestones.length : enrollees.length})
            </span>
          </button>
        ))}
      </div>

      {showMilestoneForm && isOwner && (
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
              <label className="flex items-start gap-3 text-sm font-bold">
                <input
                  {...milestoneForm.register("requiresPrevious")}
                  type="checkbox"
                  disabled={createMilestoneTx.isPending || milestones.length === 0}
                  className="mt-1 h-4 w-4 accent-black"
                />
                <span>
                  Require previous milestone first
                  <span className="text-muted-foreground block text-xs font-medium">
                    {milestones.length === 0
                      ? "The first milestone is always unlocked."
                      : "Learners must complete the previous milestone before this one can be verified."}
                  </span>
                </span>
              </label>
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
                      Submitting...
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
                {isOwner && (
                  <Button
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={() => setShowMilestoneForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Milestone
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            milestones.map((milestone, index) => {
              const completedBy = completions
                .filter(
                  completion => completion.milestoneId === milestone.id && completion.completed
                )
                .map(completion => completion.enrollee)
              const isCompleted = completedBy.length > 0
              const isExpanded = expandedMilestone === milestone.id
              const isVerifying = verifyPayoutTx.isPending && activeMilestoneTxId === milestone.id
              const eligibleEnrollees = getEligibleEnrollees(milestone)
              const lockedForViewer =
                !isOwner &&
                !!address &&
                milestone.requiresPrevious &&
                milestone.id > 0 &&
                !viewerCompletedMilestoneIds.has(milestone.id) &&
                !viewerCompletedMilestoneIds.has(milestone.id - 1)
              const lockedForOwner =
                isOwner &&
                milestone.requiresPrevious &&
                eligibleEnrollees.length === 0 &&
                enrollees.some(
                  enrollee =>
                    !isMilestoneCompletedBy(milestone.id, enrollee) &&
                    !isMilestoneUnlockedForEnrollee(milestone, enrollee)
                )
              const isLocked = lockedForViewer || lockedForOwner

              return (
                <div
                  key={milestone.id}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <button
                    type="button"
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} milestone ${milestone.title}`}
                    onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
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
                              <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="text-muted-foreground text-xs font-bold">
                                    Milestone {milestone.id + 1}
                                  </span>
                                  {milestone.requiresPrevious && (
                                    <Badge variant="outline" className="gap-1">
                                      Sequential
                                    </Badge>
                                  )}
                                  {isLocked && (
                                    <Badge
                                      variant="outline"
                                      className="gap-1"
                                      title="Complete previous milestone first"
                                    >
                                      <Lock className="h-3 w-3" />
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                                <h3
                                  className={`font-black ${isCompleted ? "text-muted-foreground" : ""}`}
                                >
                                  {milestone.title}
                                </h3>
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-2">
                                <Badge variant={isCompleted ? "success" : "default"}>
                                  {formatTokens(toSafeNumber(milestone.rewardAmount))} USDC
                                </Badge>
                                {isExpanded ? (
                                  <ChevronUp className="text-muted-foreground h-4 w-4" />
                                ) : (
                                  <ChevronDown className="text-muted-foreground h-4 w-4" />
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="animate-fade-in-up mt-3">
                                <p className="text-muted-foreground mb-3 text-sm">
                                  {milestone.description}
                                </p>
                                {completedBy.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-muted-foreground mb-2 text-xs font-bold">
                                      Completed by:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {completedBy.map(enrollee => (
                                        <span
                                          key={enrollee}
                                          className="bg-success/10 border-border border-[1.5px] px-2 py-1 font-mono text-xs font-bold shadow-[1px_1px_0_var(--color-border)]"
                                        >
                                          {enrollee}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {isLocked && (
                                  <p
                                    className="text-muted-foreground mb-3 text-xs font-bold"
                                    title="Complete previous milestone first"
                                  >
                                    Complete previous milestone first.
                                  </p>
                                )}
                                {isOwner && enrollees.length > 0 && (
                                  <Button
                                    variant={verifyPayoutTx.isFailure ? "danger" : "outline"}
                                    size="sm"
                                    className="shimmer-on-hover"
                                    disabled={
                                      isVerifying ||
                                      !isSupportedNetwork ||
                                      eligibleEnrollees.length === 0
                                    }
                                    title={
                                      eligibleEnrollees.length === 0 && milestone.requiresPrevious
                                        ? "Complete previous milestone first"
                                        : undefined
                                    }
                                    onClick={event => {
                                      event.stopPropagation()
                                      void handleVerifyAndPayout(milestone)
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

      {activeTab === "enrollees" && (
        <div className="space-y-4">
          {enrollees.length === 0 ? (
            <Card className="animate-fade-in-up">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-primary border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-black">No enrollees yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {isOwner
                    ? "Add learners to this quest."
                    : "Be the first learner to join this quest."}
                </p>
                {isOwner ? (
                  <Button
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={() => setShowAddEnrollee(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Enrollee
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="shimmer-on-hover"
                    onClick={() => void handleEnroll()}
                    disabled={enrollTx.isPending || isEnrolled || !isSupportedNetwork || !address}
                  >
                    <UserPlus className="h-4 w-4" />
                    {isEnrolled ? "Already Enrolled" : "Enroll"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            enrollees.map((enrollee, index) => {
              const completed = completions.filter(
                completion => completion.enrollee === enrollee && completion.completed
              ).length
              const earned = milestones
                .filter(milestone => isMilestoneCompletedBy(milestone.id, enrollee))
                .reduce((sum, milestone) => sum + toSafeNumber(milestone.rewardAmount), 0)
              const isAllDone = completed === milestones.length && milestones.length > 0

              return (
                <div
                  key={enrollee}
                  className={`reveal-up ${contentInView ? "in-view" : ""}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <Card className="neo-lift group hover:shadow-[7px_7px_0_var(--color-border)] active:shadow-[2px_2px_0_var(--color-border)]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary border-border flex h-10 w-10 items-center justify-center border-[2px] font-mono text-sm font-black shadow-[2px_2px_0_var(--color-border)] transition-shadow group-hover:shadow-[3px_3px_0_var(--color-border)]">
                            {enrollee.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-bold">{enrollee}</p>
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
                            onClick={() => void handleRemoveEnrollee(enrollee)}
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
          const transaction = pendingTransaction
          setShowConfirmDialog(false)
          setPendingTransaction(null)
          if (transaction) {
            void transaction.execute()
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
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold">{ms.title}</p>
                            <p className="text-muted-foreground text-xs">{ms.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ms.requiresPrevious && i > 0 && (
                              <Badge variant="outline">Sequential</Badge>
                            )}
                            <Badge>{formatTokens(ms.rewardAmount)} USDC</Badge>
                          </div>
                        </div>
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
