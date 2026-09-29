import { useState } from "react"
import { AlertTriangle, ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { questClient } from "@/lib/contracts/quest"
import { useWallet } from "@/hooks/use-wallet"
import { useNotification } from "@/contexts/notification-context"

interface TransferOwnershipDialogProps {
  open: boolean
  questId: number
  questName: string
  currentOwner: string
  onClose: () => void
  onSuccess?: () => void
}

function isValidStellarAddress(addr: string): boolean {
  if (addr.length !== 56) return false
  if (addr[0] !== "G" && addr[0] !== "C") return false
  return /^[A-Z2-7]{56}$/.test(addr)
}

export function TransferOwnershipDialog({
  open,
  questId,
  questName,
  currentOwner,
  onClose,
  onSuccess,
}: TransferOwnershipDialogProps) {
  const { address } = useWallet()
  const { addToast } = useNotification()
  const [newOwner, setNewOwner] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = newOwner.trim()
  const isSelf = trimmed === currentOwner || trimmed === address
  const isValid = isValidStellarAddress(trimmed) && !isSelf

  const handleTransfer = async () => {
    if (!isValid || !address) return
    setError(null)
    setLoading(true)

    try {
      await questClient.transferQuestOwnership(address, questId, trimmed)
      addToast({
        title: "Ownership Transfer Initiated",
        message: `Transfer proposal sent to ${trimmed.slice(0, 6)}...${trimmed.slice(-4)}. They must accept to complete the transfer.`,
        type: "success",
        category: "quest_status",
      })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err?.message || "Failed to initiate ownership transfer. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 text-warning">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Transfer Quest Ownership</DialogTitle>
              <DialogDescription className="text-xs">
                Transfer management for <span className="font-semibold text-foreground">{questName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
              <div>
                <p className="font-semibold">Two-Step Ownership Transfer</p>
                <p className="mt-1 text-muted-foreground">
                  Ownership is transferred in two steps. After you initiate, the nominated recipient must accept the transfer. Until accepted, you remain the active owner.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="new-owner-input" className="block text-xs font-semibold text-foreground">
              Recipient Stellar Address (G... or C...)
            </label>
            <input
              id="new-owner-input"
              type="text"
              placeholder="e.g. GABX... or CAX..."
              value={newOwner}
              onChange={(e) => {
                setNewOwner(e.target.value)
                setError(null)
              }}
              disabled={loading}
              className="w-full rounded border border-input bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {trimmed.length > 0 && !isValidStellarAddress(trimmed) && (
              <p className="text-xs text-destructive">
                Must be a valid 56-character Stellar account (G...) or contract (C...) address.
              </p>
            )}
            {isSelf && trimmed.length > 0 && (
              <p className="text-xs text-destructive">
                Cannot transfer ownership to yourself.
              </p>
            )}
            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleTransfer}
            disabled={!isValid || loading}
            className="gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Initiating...
              </>
            ) : (
              <>
                Propose Transfer
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
