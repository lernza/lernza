import { useCallback, useState } from "react"
import { questClient } from "@/lib/contracts/quest"
import { recordReferralEnrollment } from "@/lib/referrals"
import type { useToast } from "@/hooks/use-toast"

export interface UseEnrolleeActionsParams {
  questId: number
  address?: string
  quest?: { owner: string } | null
  addToast: ReturnType<typeof useToast>["addToast"]
}

export interface UseEnrolleeActionsReturn {
  enrolleeToRemove: { address: string } | null
  setEnrolleeToRemove: (value: { address: string } | null) => void
  handleAddEnrollee: () => void
  handleAddMilestone: () => void
  handleVerifyCompletion: (milestoneId: number) => void
  handleRemoveEnrollee: (enrollee: { address: string }) => void
  confirmRemoveEnrollee: (enrollee: { address: string }) => Promise<void>
}

/** Enrollee/milestone placeholder actions plus the owner-only removal flow. */
export function useEnrolleeActions({
  questId,
  address,
  quest,
  addToast,
}: UseEnrolleeActionsParams): UseEnrolleeActionsReturn {
  const [enrolleeToRemove, setEnrolleeToRemove] = useState<{ address: string } | null>(null)


  const handleAddEnrollee = useCallback(() => {
    if (address) {
      recordReferralEnrollment(questId, address)
    }
    addToast("Add enrollee clicked", "info")
  }, [addToast, address, questId])

  const handleRemoveEnrollee = useCallback(
    (enrollee: { address: string }) => setEnrolleeToRemove(enrollee),
    []
  )

  const confirmRemoveEnrollee = useCallback(
    async (enrollee: { address: string }) => {
      if (!address || !quest || quest.owner !== address) {
        addToast("Only the quest owner can remove a learner.", "error")
        return
      }
      try {
        await questClient.removeEnrollee(address, questId, enrollee.address)
        setEnrolleeToRemove(null)
        addToast("Learner removed. Verified work and earned rewards remain protected.", "success")
        window.location.reload()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Removal failed."
        addToast(
          message.includes("RemovalBlockedByPendingApproval") ||
            message.includes("LeaveBlockedByPendingApproval")
            ? "Removal is blocked while a submission is awaiting review or reward settlement."
            : message,
          "error"
        )
      }
    },
    [addToast, address, quest, questId]
  )

  const handleAddMilestone = useCallback(() => {
    addToast("Add milestone clicked", "info")
  }, [addToast])

  const handleVerifyCompletion = useCallback(
    (milestoneId: number) => {
      addToast(`Verified milestone ${milestoneId}`, "success")
    },
    [addToast]
  )

  return {
    enrolleeToRemove,
    setEnrolleeToRemove,
    handleAddEnrollee,
    handleAddMilestone,
    handleVerifyCompletion,
    handleRemoveEnrollee,
    confirmRemoveEnrollee,
  }
}
