import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BatchClaimResultDialog } from "@/components/quest/BatchClaimResultDialog"
import { ReportQuestDialog } from "@/components/report-quest-dialog"
import { TransferOwnershipDialog } from "@/components/quest/transfer-ownership-dialog"
import type { BatchClaimSummary, MilestoneClaimResult } from "@/lib/contract-types"

export interface QuestDialogsProps {
  questId: number
  questName: string
  currentOwner: string
  isQuestOwner: boolean
  // Batch claim results
  isClaimDialogOpen: boolean
  claimSummary: BatchClaimSummary | null
  onCloseClaimDialog: () => void
  onRetryFailed: (failedResults: MilestoneClaimResult[]) => Promise<void>
  isRetrying: boolean
  // Report quest
  isReportOpen: boolean
  onOpenReport: () => void
  onCloseReport: () => void
  // Remove enrollee
  enrolleeToRemove: { address: string } | null
  onCancelRemoveEnrollee: () => void
  onConfirmRemoveEnrollee: (enrollee: { address: string }) => Promise<void>
  // Transfer ownership
  isTransferDialogOpen: boolean
  onCloseTransfer: () => void
}

/** Every modal the quest view can raise: claim results, report, removal, transfer. */
export function QuestDialogs(props: QuestDialogsProps) {
  const {
    questId,
    questName,
    currentOwner,
    isQuestOwner,
    isClaimDialogOpen,
    claimSummary,
    onCloseClaimDialog,
    onRetryFailed,
    isRetrying,
    isReportOpen,
    // onOpenReport is used by the page-level report button
    onCloseReport,
    enrolleeToRemove,
    onCancelRemoveEnrollee,
    onConfirmRemoveEnrollee,
    isTransferDialogOpen,
    onCloseTransfer,
  } = props

  return (
    <>
      <BatchClaimResultDialog
        isOpen={isClaimDialogOpen}
        summary={claimSummary}
        onClose={onCloseClaimDialog}
        onRetryFailed={onRetryFailed}
        isRetrying={isRetrying}
      />

      <ReportQuestDialog
        isOpen={isReportOpen}
        questId={questId}
        questName={questName}
        onClose={onCloseReport}
      />

      <Dialog
        open={enrolleeToRemove !== null}
        onOpenChange={open => {
          if (!open) onCancelRemoveEnrollee()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove learner?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Verified milestones and earned rewards stay protected.
              A learner with a submission awaiting review or reward settlement cannot be removed
              until the review is resolved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelRemoveEnrollee}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!enrolleeToRemove}
              onClick={() => enrolleeToRemove && void onConfirmRemoveEnrollee(enrolleeToRemove)}
            >
              Remove learner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isQuestOwner && (
        <TransferOwnershipDialog
          open={isTransferDialogOpen}
          questId={questId}
          questName={questName}
          currentOwner={currentOwner}
          onClose={onCloseTransfer}
        />
      )}
    </>
  )
}
