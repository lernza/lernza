import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { ArrowLeft, Check, Loader2, Coins, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatTokens, cn } from "@/lib/utils"
import { track } from "@/lib/analytics"
import { milestoneSchema, type TxPhase } from "./types"
import { useQuestCreation } from "./context"
import { useWallet } from "@/hooks/use-wallet"
import { questClient, Visibility } from "@/lib/contracts/quest"
import { rewardsClient } from "@/lib/contracts/rewards"
import { milestoneClient } from "@/lib/contracts/milestone"
import { invalidateQuestQueries, invalidateFundingQueries } from "@/lib/query-invalidation"
import { setQuestReferralConfig } from "@/lib/referrals"
import {
  getConfiguredRewardToken,
  getVerifiedRewardToken,
  REWARD_TOKEN_ALLOWLIST_VERSION,
} from "@/lib/reward-tokens"

interface Step3ReviewProps {
  onComplete: () => void
}

export function Step3Review({ onComplete }: Step3ReviewProps) {
  const { step1Data, step2Data, goToBack } = useQuestCreation()
  const { address } = useWallet()
  const queryClient = useQueryClient()
  const [txPhase, setTxPhase] = useState<TxPhase>("idle")
  const [txError, setTxError] = useState<string | null>(null)
  const [createdQuestId, setCreatedQuestId] = useState<number | null>(null)

  const totalReward = step2Data.milestones.reduce(
    (sum: number, m: z.infer<typeof milestoneSchema>) => sum + m.rewardAmount,
    0
  )

  const rewardToken = getConfiguredRewardToken()

  const handleFund = async () => {
    if (!address) return
    setTxPhase("funding")
    setTxError(null)

    try {
      if (!createdQuestId && createdQuestId !== 0) {
        throw new Error("Quest must be created before funding. Create the quest first.")
      }
      const verifiedToken = await getVerifiedRewardToken()
      const amount = BigInt(totalReward) * BigInt(10 ** verifiedToken.decimals)
      const result = await rewardsClient.fundQuest(address, createdQuestId, amount)
      if (result.status === "FAILED") {
        throw new Error(result.error || "Funding failed")
      }
      await invalidateFundingQueries(queryClient, createdQuestId)
      setTxPhase("funded")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Funding failed"
      setTxError(message)
      setTxPhase("idle")
    }
  }

  const handleCreate = async () => {
    if (!address) return
    setTxPhase("creating")
    setTxError(null)

    try {
      const verifiedToken = await getVerifiedRewardToken()
      const result = await questClient.createQuest(
        address,
        step1Data.name,
        step1Data.description,
        step1Data.category,
        step1Data.tags || [],
        verifiedToken.contractId,
        Visibility.Unlisted
      )

      if (result.status === "FAILED") {
        throw new Error(result.error || "Quest creation failed")
      }

      // Parse quest ID from the return value if available
      let questId = 0
      if (result.resultXdr) {
        try {
          const { scValToNative, xdr } = await import("@stellar/stellar-sdk")
          const native = scValToNative(xdr.ScVal.fromXDR(result.resultXdr, "base64"))
          questId = Number(native)
        } catch {
          // Fallback: try to get quest count
          questId = (await questClient.getQuestCount()) - 1
        }
      } else {
        questId = (await questClient.getQuestCount()) - 1
      }

      setCreatedQuestId(questId)

      // Initialize quest referral program settings
      setQuestReferralConfig(questId, {
        enabled: (step1Data.referralBonus ?? 10) > 0,
        bonusAmount: step1Data.referralBonus ?? 10,
        rewardTrigger: "complete",
      })

      // Create milestones on-chain
      for (let i = 0; i < step2Data.milestones.length; i++) {
        const m = step2Data.milestones[i]
        const rewardAmount = BigInt(m.rewardAmount) * BigInt(1_000_000)
        await milestoneClient.createMilestoneWithPrerequisites(
          address,
          questId,
          m.title,
          m.description,
          rewardAmount,
          m.prerequisiteIds
        )
      }

      await invalidateQuestQueries(queryClient, questId)
      setTxPhase("created")
      track("quest_created", {
        milestone_count: step2Data.milestones.length,
        total_reward: totalReward,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Quest creation failed"
      setTxError(message)
      setTxPhase("idle")
    }
  }

  const handleFinalize = () => {
    onComplete()
  }

  const handlePublish = async () => {
    if (!address || createdQuestId === null) return
    setTxPhase("creating")
    setTxError(null)
    try {
      const result = await questClient.updateQuest(
        address,
        createdQuestId,
        undefined,
        undefined,
        undefined,
        undefined,
        Visibility.Public
      )
      if (result.status === "FAILED") throw new Error(result.error || "Publishing failed")
      setTxPhase("done")
    } catch (err: unknown) {
      setTxError(err instanceof Error ? err.message : "Publishing failed")
      setTxPhase("funded")
    }
  }

  const isBusy = txPhase === "creating" || txPhase === "funding"

  return (
    <div className="space-y-6">
      <div>
        <div className="bg-accent border-border border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Step 3 — Fund & Review
            </span>
          </div>
        </div>
        <div className="border-border bg-background divide-border divide-y-[2px] border border-t-0 shadow-md">
          {/* Quest summary */}
          <div className="space-y-2 p-5">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              Quest Details
            </p>
            <h3 className="text-xl font-semibold">{step1Data.name}</h3>
            <p className="text-muted-foreground text-sm">{step1Data.description}</p>
            {step1Data.category && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-bold uppercase">Category:</span>
                <Badge variant="outline">{step1Data.category}</Badge>
              </div>
            )}
            {step1Data.tags && step1Data.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground text-xs font-bold uppercase">Tags:</span>
                {step1Data.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="bg-accent border-border border px-2 py-0.5 text-xs font-semibold"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Milestones list */}
          <div className="p-5">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              Milestones ({step2Data.milestones.length})
            </p>
            <div className="space-y-2">
              {step2Data.milestones.map((m: z.infer<typeof milestoneSchema>, i: number) => (
                <div
                  key={i}
                  className="bg-secondary border-border flex items-start justify-between gap-3 border-[1.5px] p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="bg-accent border-border mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border-[1.5px] text-[10px] font-semibold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{m.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">{m.description}</p>
                      {m.prerequisiteIds.length > 0 && (
                        <p className="text-muted-foreground mt-1 text-xs font-semibold">
                          Requires: {m.prerequisiteIds.map(id => `Step ${id + 1}`).join(", ")}
                        </p>
                      )}
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
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              Reward Pool
            </p>
            <div className="bg-accent border-border mb-4 flex items-center justify-between border p-4 shadow-md">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <span className="font-semibold">
                  Total {rewardToken?.symbol ?? "reward tokens"} needed
                </span>
              </div>
              <span className="text-xl font-semibold tabular-nums">
                {formatTokens(totalReward)} {rewardToken?.symbol ?? "tokens"}
              </span>
            </div>

            <p className="text-muted-foreground mb-4 text-xs">
              {rewardToken ? (
                <>
                  Verified {rewardToken.name} ({rewardToken.decimals} decimals). Allowlist v
                  {REWARD_TOKEN_ALLOWLIST_VERSION}.{" "}
                  <a
                    className="underline"
                    href={rewardToken.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View contract
                  </a>
                </>
              ) : (
                "No approved reward token is configured for this network. Unsupported tokens cannot be used."
              )}
            </p>

            {txError && (
              <div className="border-destructive bg-destructive/10 mb-4 flex items-start gap-2 border p-3">
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-destructive text-sm">{txError}</p>
              </div>
            )}

            {/* Create quest button */}
            <Button
              onClick={handleCreate}
              disabled={txPhase !== "idle" || isBusy}
              variant={
                txPhase === "created" || txPhase === "funded" || txPhase === "done"
                  ? "secondary"
                  : "default"
              }
              className={cn(
                "shimmer-on-hover mb-3 w-full",
                (txPhase === "created" || txPhase === "funded" || txPhase === "done") &&
                  "border-success"
              )}
            >
              {txPhase === "creating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating quest on-chain...
                </>
              ) : txPhase === "created" || txPhase === "funded" || txPhase === "done" ? (
                <>
                  <Check className="h-4 w-4" />
                  Quest saved as private setup
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Quest on-chain
                </>
              )}
            </Button>

            {/* Fund button */}
            <Button
              onClick={handleFund}
              disabled={txPhase !== "created" || isBusy}
              variant={txPhase === "funded" || txPhase === "done" ? "secondary" : "default"}
              className={cn(
                "shimmer-on-hover mb-3 w-full",
                (txPhase === "funded" || txPhase === "done") && "border-success"
              )}
            >
              {txPhase === "funding" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Funding reward pool...
                </>
              ) : txPhase === "funded" || txPhase === "done" ? (
                <>
                  <Check className="h-4 w-4" />
                  Reward pool funded
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  Fund Reward Pool ({formatTokens(totalReward)} {rewardToken?.symbol ?? "tokens"})
                </>
              )}
            </Button>

            {/* Publish button */}
            {txPhase === "funded" && (
              <Button onClick={handlePublish} className="shimmer-on-hover w-full">
                <Sparkles className="h-4 w-4" />
                Publish Quest
              </Button>
            )}

            {txPhase === "done" && (
              <Button onClick={handleFinalize} className="shimmer-on-hover w-full">
                <Check className="h-4 w-4" />
                Return to Dashboard
              </Button>
            )}

            {txPhase === "idle" && !txError && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                First create the quest on-chain, then fund the reward pool.
              </p>
            )}
            {txPhase === "created" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                Quest created! Fund the pool to activate rewards.
              </p>
            )}
            {txPhase === "funded" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                Pool funded. Publish when you are ready to make the quest discoverable.
              </p>
            )}
            {txPhase === "done" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                Quest published with a funded reward pool.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={goToBack} disabled={isBusy}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  )
}
