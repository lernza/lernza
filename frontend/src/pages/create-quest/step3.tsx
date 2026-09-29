import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { ArrowLeft, Check, Loader2, Coins, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n"
import { formatTokens, cn } from "@/lib/utils"
import { track } from "@/lib/analytics"
import { milestoneSchema, type TxPhase } from "./types"
import { useQuestCreation } from "./context"
import { useWallet } from "@/hooks/use-wallet"
import { useWalletBalance } from "@/hooks/use-wallet-balance"
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
  const { t } = useTranslation()
  const { step1Data, step2Data, goToBack } = useQuestCreation()
  const { address, networkName } = useWallet()
  const {
    rewardBalance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useWalletBalance(address, networkName)
  const queryClient = useQueryClient()
  const [txPhase, setTxPhase] = useState<TxPhase>("idle")
  const [txError, setTxError] = useState<string | null>(null)
  const [createdQuestId, setCreatedQuestId] = useState<number | null>(null)
  const [createdMilestoneCount, setCreatedMilestoneCount] = useState(0)
  const [questCreated, setQuestCreated] = useState(false)

  const totalReward = step2Data.milestones.reduce(
    (sum: number, m: z.infer<typeof milestoneSchema>) => sum + m.rewardAmount,
    0
  )

  const rewardToken = getConfiguredRewardToken()

  const hasInsufficientBalance = rewardBalance !== null && parseFloat(rewardBalance) < totalReward

  const handleFund = async () => {
    if (!address) return
    setTxPhase("funding")
    setTxError(null)

    try {
      if (!createdQuestId && createdQuestId !== 0) {
        throw new Error(t("create.error.mustCreateFirst"))
      }
      const verifiedToken = await getVerifiedRewardToken()
      const amount = BigInt(totalReward) * 10n ** BigInt(verifiedToken.decimals)
      const result = await rewardsClient.fundQuest(address, createdQuestId, amount)
      if (result.status === "FAILED") {
        throw new Error(result.error || t("create.error.fundingFailed"))
      }
      await invalidateFundingQueries(queryClient, createdQuestId)
      setTxPhase("funded")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("create.error.fundingFailed")
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
      const countBefore = await questClient.getQuestCount()

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
        throw new Error(result.error || t("create.error.creationFailed"))
      }

      // Parse quest ID from the return value if available
      let questId = 0
      if (result.resultXdr) {
        try {
          const { scValToNative, xdr } = await import("@stellar/stellar-sdk")
          const native = scValToNative(xdr.ScVal.fromXDR(result.resultXdr, "base64"))
          questId = Number(native)
        } catch {
          // Fallback: use count captured before creation to avoid TOCTOU race
          questId = countBefore
        }
      } else {
        questId = countBefore
      }

      setCreatedQuestId(questId)
      setQuestCreated(true)

      // Initialize quest referral program settings
      setQuestReferralConfig(questId, {
        enabled: (step1Data.referralBonus ?? 10) > 0,
        bonusAmount: step1Data.referralBonus ?? 10,
        rewardTrigger: "complete",
      })

      // Create milestones on-chain with progress tracking (#1721)
      let milestonesCreated = 0
      const totalMilestones = step2Data.milestones.length
      try {
        for (let i = 0; i < totalMilestones; i++) {
          const m = step2Data.milestones[i]
          const rewardAmount = BigInt(m.rewardAmount) * 10n ** BigInt(verifiedToken.decimals)
          await milestoneClient.createMilestoneWithPrerequisites(
            address,
            questId,
            m.title,
            m.description,
            rewardAmount,
            m.prerequisiteIds
          )
          milestonesCreated = i + 1
          setCreatedMilestoneCount(milestonesCreated)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Milestone creation failed"
        setTxError(
          milestonesCreated < totalMilestones
            ? `Created ${milestonesCreated} of ${totalMilestones} milestones. Milestone ${milestonesCreated + 1} failed: ${message}`
            : message
        )
        setCreatedMilestoneCount(milestonesCreated)
        return
      }

      await invalidateQuestQueries(queryClient, questId)
      setTxPhase("created")
      track("quest_created", {
        milestone_count: step2Data.milestones.length,
        total_reward: totalReward,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("create.error.creationFailed")
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
      if (result.status === "FAILED")
        throw new Error(result.error || t("create.error.publishingFailed"))
      setTxPhase("done")
    } catch (err: unknown) {
      setTxError(err instanceof Error ? err.message : t("create.error.publishingFailed"))
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
              {t("create.step3")}
            </span>
          </div>
        </div>
        <div className="border-border bg-background divide-border divide-y-[2px] border border-t-0 shadow-md">
          {/* Quest summary */}
          <div className="space-y-2 p-5">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              {t("create.questDetails")}
            </p>
            <h3 className="text-xl font-semibold">{step1Data.name}</h3>
            <p className="text-muted-foreground text-sm">{step1Data.description}</p>
            {step1Data.category && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-bold uppercase">
                  {t("create.reviewCategory")}
                </span>
                <Badge variant="outline">{step1Data.category}</Badge>
              </div>
            )}
            {step1Data.tags && step1Data.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground text-xs font-bold uppercase">
                  {t("create.reviewTags")}
                </span>
                {step1Data.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-accent border-border border px-2 py-0.5 text-xs font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Milestones list */}
          <div className="p-5">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              {t("create.reviewMilestones", { count: step2Data.milestones.length })}
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
                          {t("create.reviewRequires", {
                            milestones: m.prerequisiteIds
                              .map(id => t("create.prerequisiteStep", { index: id + 1 }))
                              .join(", "),
                          })}
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
              {t("create.rewardPool")}
            </p>
            <div className="bg-accent border-border mb-4 flex items-center justify-between border p-4 shadow-md">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <div>
                  <span className="block font-semibold">
                    {t("create.totalNeeded", { symbol: rewardToken?.symbol ?? "reward tokens" })}
                  </span>
                  <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    {t("create.walletBalance")}{" "}
                    {balanceLoading ? (
                      <span className="inline-flex items-center gap-1 font-bold">
                        <Loader2 className="h-3 w-3 animate-spin" /> {t("create.checkingBalance")}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "font-bold",
                          hasInsufficientBalance ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {rewardBalance ?? "0.00"} {rewardToken?.symbol ?? "tokens"}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <span className="text-xl font-semibold tabular-nums">
                {formatTokens(totalReward)} {rewardToken?.symbol ?? "tokens"}
              </span>
            </div>

            {hasInsufficientBalance && (
              <div className="border-destructive bg-destructive/10 mb-4 flex items-start gap-2 border p-3">
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="text-destructive text-sm font-semibold">
                    {t("create.insufficientBalance")}
                  </p>
                  <p className="text-destructive/90 mt-0.5 text-xs">
                    {t("create.insufficientBalanceBody", {
                      amount: formatTokens(totalReward),
                      symbol: rewardToken?.symbol ?? "tokens",
                      balance: rewardBalance ?? "0.00",
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Balance display */}
            {balanceLoading ? (
              <div className="bg-secondary border-border mb-4 flex items-center justify-between border p-3">
                <span className="text-muted-foreground text-sm">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  {t("create.loadingBalance")}
                </span>
              </div>
            ) : rewardBalance !== null ? (
              <div className="bg-secondary border-border mb-4 flex items-center justify-between border p-3">
                <span className="text-muted-foreground text-sm font-semibold">
                  {t("create.yourBalance")}
                </span>
                <span className="font-semibold tabular-nums">
                  {rewardBalance} {rewardToken?.symbol ?? "tokens"}
                </span>
              </div>
            ) : null}

            {balanceError && (
              <div className="border-destructive bg-destructive/10 mb-4 flex items-start gap-2 border p-3">
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-destructive text-sm">{balanceError}</p>
              </div>
            )}

            {hasInsufficientBalance && (
              <div className="border-destructive bg-destructive/10 mb-4 flex items-start gap-2 border p-3">
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-destructive text-sm">
                  {t("create.insufficientBalanceShort", {
                    amount: formatTokens(totalReward),
                    symbol: rewardToken?.symbol ?? "tokens",
                    balance: rewardBalance,
                  })}
                </p>
              </div>
            )}

            <p className="text-muted-foreground mb-4 text-xs">
              {rewardToken ? (
                <>
                  {t("create.verifiedToken", {
                    name: rewardToken.name,
                    decimals: rewardToken.decimals,
                    version: REWARD_TOKEN_ALLOWLIST_VERSION,
                  })}{" "}
                  <a
                    className="underline"
                    href={rewardToken.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("create.viewContract")}
                  </a>
                </>
              ) : (
                t("create.unsupportedToken")
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
              disabled={
                (txPhase !== "idle" && !questCreated) ||
                isBusy ||
                (questCreated && txPhase === "created")
              }
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
                  {t("create.creating")}
                </>
              ) : questCreated && txError !== null ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  {`Retry remaining ${step2Data.milestones.length - createdMilestoneCount} milestone${step2Data.milestones.length - createdMilestoneCount !== 1 ? "s" : ""}`}
                </>
              ) : txPhase === "created" || txPhase === "funded" || txPhase === "done" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating quest on-chain...
                </>
              ) : txPhase === "created" || txPhase === "funded" || txPhase === "done" ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("create.savedPrivate")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("create.createOnChain")}
                </>
              )}
            </Button>

            {/* Fund button */}
            <Button
              onClick={handleFund}
              disabled={txPhase !== "created" || isBusy || hasInsufficientBalance || balanceLoading}
              variant={txPhase === "funded" || txPhase === "done" ? "secondary" : "default"}
              className={cn(
                "shimmer-on-hover mb-3 w-full",
                (txPhase === "funded" || txPhase === "done") && "border-success"
              )}
              title={hasInsufficientBalance ? t("create.insufficientBalanceTitle") : undefined}
            >
              {txPhase === "funding" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("create.funding")}
                </>
              ) : txPhase === "funded" || txPhase === "done" ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("create.funded")}
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  {t("create.fundPool", {
                    amount: formatTokens(totalReward),
                    symbol: rewardToken?.symbol ?? "tokens",
                  })}
                </>
              )}
            </Button>

            {/* Publish button */}
            {txPhase === "funded" && (
              <Button onClick={handlePublish} className="shimmer-on-hover w-full">
                <Sparkles className="h-4 w-4" />
                {t("create.publish")}
              </Button>
            )}

            {txPhase === "done" && (
              <Button onClick={handleFinalize} className="shimmer-on-hover w-full">
                <Check className="h-4 w-4" />
                {t("create.returnToDashboard")}
              </Button>
            )}

            {txPhase === "idle" && !txError && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                {t("create.hint.createFirst")}
              </p>
            )}
            {txPhase === "created" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                {t("create.hint.fund")}
              </p>
            )}
            {txPhase === "funded" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                {t("create.hint.publish")}
              </p>
            )}
            {txPhase === "done" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                {t("create.hint.done")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={goToBack} disabled={isBusy}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>
    </div>
  )
}
