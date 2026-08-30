import { useState } from "react"
import { Copy, Check, Share2, Users, Gift, Sparkles, Send } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getReferralStats, getQuestReferralConfig, claimReferralRewards } from "@/lib/referrals"

interface ReferralCardProps {
  questId: number
  questTitle: string
  userAddress: string | null
  onRewardClaimed?: (amount: number) => void
}

export function ReferralCard({
  questId,
  questTitle,
  userAddress,
  onRewardClaimed,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false)
  const [claimedNotice, setClaimedNotice] = useState<string | null>(null)

  const config = getQuestReferralConfig(questId)
  const stats = getReferralStats(questId, userAddress || "")

  const handleCopy = async () => {
    if (!stats.referralLink) return
    try {
      await navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleShareTwitter = () => {
    const text = `Join me in learning "${questTitle}" on Lernza! Start quest: ${stats.referralLink}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const handleShareTelegram = () => {
    const text = `Join me in learning "${questTitle}" on Lernza!`
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const handleClaim = () => {
    if (!userAddress) return
    const claimed = claimReferralRewards(questId, userAddress)
    if (claimed > 0) {
      setClaimedNotice(`Successfully claimed ${claimed} reward tokens!`)
      setTimeout(() => setClaimedNotice(null), 4000)
      if (onRewardClaimed) onRewardClaimed(claimed)
    }
  }

  if (!config.enabled) return null

  return (
    <Card className="border-primary/20 from-card to-primary/5 bg-gradient-to-br">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-primary h-5 w-5" />
            <CardTitle className="text-lg">Refer & Earn</CardTitle>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary font-medium">
            +{config.bonusAmount} tokens / referral
          </Badge>
        </div>
        <CardDescription>
          Invite friends to earn rewards when they join and complete milestones on this quest.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {userAddress ? (
          <>
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Your Unique Referral Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={stats.referralLink}
                  className="border-input bg-muted text-foreground flex-1 rounded-md border px-3 py-2 font-mono text-xs select-all focus:outline-none"
                  aria-label="Referral link"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0 gap-1.5"
                  aria-label="Copy referral link"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Social Sharing */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-muted-foreground mr-1 text-xs">Share via:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                aria-label="Share on X (Twitter)"
                onClick={handleShareTwitter}
              >
                <Share2 className="h-3.5 w-3.5" />X / Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                aria-label="Share on Telegram"
                onClick={handleShareTelegram}
              >
                <Send className="h-3.5 w-3.5" />
                Telegram
              </Button>
            </div>

            {/* Referral Stats Summary */}
            <div className="border-border grid grid-cols-3 gap-2 border-t pt-2">
              <div className="bg-background/60 border-border rounded-lg border p-2.5 text-center">
                <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">Referred</span>
                </div>
                <div className="text-base font-bold">{stats.totalReferrals}</div>
              </div>

              <div className="bg-background/60 border-border rounded-lg border p-2.5 text-center">
                <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs">Completed</span>
                </div>
                <div className="text-base font-bold text-green-600 dark:text-green-400">
                  {stats.completedReferrals}
                </div>
              </div>

              <div className="bg-background/60 border-border rounded-lg border p-2.5 text-center">
                <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <Gift className="text-primary h-3.5 w-3.5" />
                  <span className="text-xs">Earned</span>
                </div>
                <div className="text-primary text-base font-bold">{stats.totalEarned}</div>
              </div>
            </div>

            {/* Claim Section */}
            {stats.claimableAmount > 0 && (
              <div className="bg-primary/10 border-primary/20 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-primary text-xs font-semibold">Unclaimed Bonus</div>
                  <div className="text-sm font-bold">{stats.claimableAmount} Tokens</div>
                </div>
                <Button size="sm" onClick={handleClaim}>
                  Claim Rewards
                </Button>
              </div>
            )}

            {claimedNotice && (
              <div className="rounded-md border border-green-500/20 bg-green-500/10 p-2.5 text-center text-xs font-medium text-green-600 dark:text-green-400">
                {claimedNotice}
              </div>
            )}
          </>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-muted-foreground text-xs">
              Connect your wallet to generate your personal referral link and start earning bonuses.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
