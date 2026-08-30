import { useState, useEffect } from "react"
import { Copy, Check, Loader2, Plus, Link as LinkIcon, Trash2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { generateInviteCode, hashInviteCode, generateInviteLink } from "@/lib/invite-utils"
import { questClient } from "@/lib/contracts/quest"
import { useToast } from "@/hooks/use-toast"

interface InviteEntry {
  code: string
  commitment: string
  created: Date
  redeemed: boolean
  visible: boolean
}

interface InviteManagementProps {
  questId: number
  questName: string
  isOwner: boolean
}

export function InviteManagement({ questId, isOwner }: InviteManagementProps) {
  const { address } = useWallet()
  const { addToast } = useToast()
  const [invites, setInvites] = useState<InviteEntry[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (!isOwner) return

    const checkInviteStatus = async () => {
      setIsChecking(true)
      try {
        const updated = await Promise.all(
          invites.map(async invite => {
            const isValid = await questClient.isInviteValid(questId, invite.commitment)
            return { ...invite, redeemed: !isValid }
          })
        )
        setInvites(updated)
      } catch (err) {
        console.error("Failed to check invite status:", err)
      } finally {
        setIsChecking(false)
      }
    }

    if (invites.length > 0) {
      const interval = setInterval(checkInviteStatus, 30000)
      checkInviteStatus()
      return () => clearInterval(interval)
    }
  }, [questId, isOwner, invites.length])

  const handleGenerateInvite = async () => {
    if (!address) return

    setIsGenerating(true)
    try {
      const code = generateInviteCode()
      const commitment = await hashInviteCode(code)

      try {
        await questClient.registerInvite(address, questId, commitment)

        const newInvite: InviteEntry = {
          code,
          commitment,
          created: new Date(),
          redeemed: false,
          visible: false,
        }

        setInvites(prev => [...prev, newInvite])
        addToast("Invite generated successfully", "success")
      } catch (err) {
        addToast(
          `Failed to register invite on-chain: ${err instanceof Error ? err.message : "Unknown error"}`,
          "error"
        )
      }
    } catch (err) {
      addToast(
        `Failed to generate invite: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = (index: number) => {
    const invite = invites[index]
    const link = generateInviteLink(questId, invite.code)
    navigator.clipboard.writeText(link)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
    addToast("Invite link copied to clipboard", "success")
  }

  const handleRevokeInvite = async (index: number) => {
    const invite = invites[index]
    if (!address) return

    try {
      await questClient.revokeInvite(address, questId, invite.commitment)
      setInvites(prev => prev.filter((_, i) => i !== index))
      addToast("Invite revoked successfully", "success")
    } catch (err) {
      addToast(
        `Failed to revoke invite: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      )
    }
  }

  const toggleCodeVisibility = (index: number) => {
    setInvites(prev => {
      const updated = [...prev]
      updated[index].visible = !updated[index].visible
      return updated
    })
  }

  if (!isOwner) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold">Invite Links</h3>
          <p className="text-muted-foreground text-sm">
            Create unique invite codes for this quest. Each code can be redeemed once.
          </p>
        </div>
        <Button
          onClick={handleGenerateInvite}
          disabled={isGenerating || isChecking}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Generate Invite
            </>
          )}
        </Button>
      </div>

      {invites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <LinkIcon className="text-muted-foreground mb-4 h-8 w-8" />
            <h4 className="mb-2 font-semibold">No invites yet</h4>
            <p className="text-muted-foreground text-sm">
              Create an invite to start sharing this quest with specific learners.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((invite, index) => (
            <Card key={`${invite.commitment}-${index}`}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={invite.redeemed ? "destructive" : "default"}>
                        {invite.redeemed ? "Redeemed" : "Active"}
                      </Badge>
                      <Badge variant="secondary">{invite.created.toLocaleDateString()}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 font-mono text-xs">
                      {invite.visible ? (
                        <code className="break-all">{invite.code}</code>
                      ) : (
                        <code className="text-muted-foreground">{"•".repeat(32)}</code>
                      )}
                      <button
                        onClick={() => toggleCodeVisibility(index)}
                        className="text-muted-foreground hover:text-foreground"
                        title={invite.visible ? "Hide code" : "Show code"}
                      >
                        {invite.visible ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(index)}
                      disabled={isChecking}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeInvite(index)}
                      disabled={isChecking || invite.redeemed}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
