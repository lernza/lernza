import { useState } from "react"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { hashInviteCode } from "@/lib/invite-utils"
import { questClient } from "@/lib/contracts/quest"
import { useToast } from "@/hooks/use-toast"

interface InviteRedemptionDialogProps {
  questId: number
  questName: string
  inviteCode: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function InviteRedemptionDialog({
  questId,
  questName,
  inviteCode,
  onSuccess,
  onCancel,
}: InviteRedemptionDialogProps) {
  const { address, connected, connect } = useWallet()
  const { addToast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<"idle" | "validating" | "joining" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleRedeem = async () => {
    if (!connected || !address) {
      await connect()
      return
    }

    setIsProcessing(true)
    setStatus("validating")
    setErrorMessage(null)

    try {
      const commitment = await hashInviteCode(inviteCode)

      const isValid = await questClient.isInviteValid(questId, commitment)
      if (!isValid) {
        throw new Error("This invite code has expired or already been redeemed")
      }

      setStatus("joining")
      await questClient.joinQuestWithInvite(address, questId, inviteCode)

      setStatus("success")
      addToast(`Successfully joined ${questName}!`, "success")
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to redeem invite"
      setErrorMessage(message)
      setStatus("error")
      addToast(message, "error")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Join Quest</h2>
              <p className="text-muted-foreground text-sm">
                You have an invite to join <span className="font-semibold">{questName}</span>
              </p>
            </div>

            {/* Status Display */}
            {status === "success" ? (
              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="bg-success/10 border-success flex h-16 w-16 items-center justify-center border-2">
                  <CheckCircle className="text-success h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold">Welcome!</h3>
                  <p className="text-muted-foreground text-sm">You've successfully joined this quest.</p>
                </div>
              </div>
            ) : status === "error" ? (
              <div className="space-y-3 rounded-lg border border-destructive bg-destructive/5 p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-destructive h-5 w-5" />
                  <h3 className="font-semibold">Something went wrong</h3>
                </div>
                <p className="text-muted-foreground text-sm">{errorMessage}</p>
              </div>
            ) : (
              <>
                {/* Invite Details */}
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-semibold">Invite Code</span>
                    <Badge variant="outline">Private</Badge>
                  </div>
                  <code className="block break-all font-mono text-xs text-foreground">{inviteCode}</code>
                </div>

                {/* Status Indicator */}
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {status === "validating"
                      ? "Validating invite code..."
                      : "Joining quest on-chain..."}
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {status !== "success" && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              {status !== "success" && (
                <Button
                  onClick={handleRedeem}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : connected ? (
                    "Redeem Invite"
                  ) : (
                    "Connect & Redeem"
                  )}
                </Button>
              )}
              {status === "success" && (
                <Button onClick={onCancel} className="w-full">
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
