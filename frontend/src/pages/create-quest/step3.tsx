import { useState } from "react"
import { z } from "zod"
import { ArrowLeft, Check, Loader2, Coins, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatTokens, cn } from "@/lib/utils"
import { track } from "@/lib/analytics"
import { milestoneSchema, Step1Values, Step2Values, TxPhase } from "./types"
import { useQuestCreation } from "./context"

interface Step3ReviewProps {
  onComplete: () => void
}

export function Step3Review({ onComplete }: Step3ReviewProps) {
  const { step1Data, step2Data, goToBack } = useQuestCreation()
  const [txPhase, setTxPhase] = useState<TxPhase>("idle")

  const totalReward = step2Data.milestones.reduce(
    (sum: number, m: z.infer<typeof milestoneSchema>) => sum + m.rewardAmount,
    0
  )

  const handleFund = async () => {
    setTxPhase("funding")
    // Simulate funding transaction via Freighter
    await new Promise(r => setTimeout(r, 2000))
    setTxPhase("funded")
  }

  const handleCreate = async () => {
    setTxPhase("creating")
    // Simulate quest creation transaction via Freighter
    await new Promise(r => setTimeout(r, 2000))
    setTxPhase("done")
    track("quest_created", {
      milestone_count: step2Data.milestones.length,
      total_reward: totalReward,
    })
    onComplete()
  }

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
                <span className="font-semibold">Total USDC needed</span>
              </div>
              <span className="text-xl font-semibold tabular-nums">
                {formatTokens(totalReward)} USDC
              </span>
            </div>

            {/* Fund button */}
            <Button
              onClick={handleFund}
              disabled={txPhase !== "idle"}
              variant={
                txPhase === "funded" || txPhase === "creating" || txPhase === "done"
                  ? "secondary"
                  : "default"
              }
              className={cn(
                "shimmer-on-hover mb-3 w-full",
                (txPhase === "funded" || txPhase === "creating" || txPhase === "done") &&
                  "border-success"
              )}
            >
              {txPhase === "funding" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Funding reward pool...
                </>
              ) : txPhase === "funded" || txPhase === "creating" || txPhase === "done" ? (
                <>
                  <Check className="h-4 w-4" />
                  Reward pool funded
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  Fund Reward Pool ({formatTokens(totalReward)} USDC)
                </>
              )}
            </Button>

            {/* Create button */}
            <Button
              onClick={handleCreate}
              disabled={txPhase !== "funded"}
              className="shimmer-on-hover w-full"
            >
              {txPhase === "creating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating quest on-chain...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Confirm & Create Quest
                </>
              )}
            </Button>

            {txPhase === "idle" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                Fund the pool first, then confirm to create the quest on Stellar.
              </p>
            )}
            {txPhase === "funded" && (
              <p className="text-muted-foreground mt-2 text-center text-xs font-bold">
                Pool funded! Sign the creation transaction to go live.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goToBack}
          disabled={txPhase === "funding" || txPhase === "creating"}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  )
}
