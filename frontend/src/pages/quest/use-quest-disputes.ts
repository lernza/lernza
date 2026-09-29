import { useCallback, useEffect, useState } from "react"
import { milestoneClient } from "@/lib/contracts/milestone"
import type { DisputeOutcome } from "@/lib/contracts/milestone-client"
import type { MilestoneDisputeState, OwnerDispute } from "@/components/quest/MilestonesSection"
import type { useToast } from "@/hooks/use-toast"

export interface UseQuestDisputesParams {
  questId: number
  address?: string
  quest?: { owner: string } | null
  milestones: { id: number }[]
  addToast: ReturnType<typeof useToast>["addToast"]
}

export interface UseQuestDisputesReturn {
  disputeStates: Map<number, MilestoneDisputeState>
  ownerDisputes: OwnerDispute[]
  isQuestOwner: boolean
  isDisputePending: boolean
  handleOpenDispute: (milestoneId: number, reason: string) => Promise<void>
  handleResolveDispute: (
    milestoneId: number,
    enrollee: string,
    outcome: DisputeOutcome,
    note?: string
  ) => Promise<void>
}

/**
 * Tracks dispute state for the connected learner plus (for quest owners) the
 * queue of open disputes awaiting a ruling. See issue #1614.
 */
export function useQuestDisputes({
  questId,
  address,
  quest,
  milestones,
  addToast,
}: UseQuestDisputesParams): UseQuestDisputesReturn {
  // Dispute state for the connected learner, so an appealable submission shows
  // the right affordance and status. See issue #1614.
  const [disputeStates, setDisputeStates] = useState<
    Map<number, MilestoneDisputeState>
  >(new Map())
  const [isDisputePending, setIsDisputePending] = useState(false)
  const [ownerDisputes, setOwnerDisputes] = useState<OwnerDispute[]>([])
  const isQuestOwner = !!address && !!quest?.owner && quest.owner === address

  // Owners additionally see every open dispute awaiting their ruling.
  useEffect(() => {
    if (!isQuestOwner) {
      setOwnerDisputes([])
      return
    }

    let cancelled = false

    const loadOwnerDisputes = async () => {
      try {
        const entries = await milestoneClient.getOpenDisputes(questId, 0, 100)
        if (cancelled) return
        setOwnerDisputes(
          entries.map(entry => ({
            milestoneId: entry.milestoneId,
            enrollee: entry.enrollee,
            reason: entry.record.reason
          }))
        )
      } catch {
        // Non-fatal: the resolve affordance simply stays hidden.
      }
    }

    void loadOwnerDisputes()
    return () => {
      cancelled = true
    }
  }, [isQuestOwner, questId])

  useEffect(() => {
    if (!address || milestones.length === 0) {
      setDisputeStates(new Map())
      return
    }

    let cancelled = false

    const loadDisputes = async () => {
      try {
        const entries: [number, MilestoneDisputeState][] = []
        for (const milestone of milestones) {
          const [status, open, cooldown] = await Promise.all([
            milestoneClient.getDisputeStatus(questId, milestone.id, address),
            milestoneClient.hasOpenDispute(questId, milestone.id, address),
            milestoneClient.getDisputeCooldownRemaining(questId, milestone.id, address)
          ])
          if (status === null) continue
          entries.push([
            milestone.id,
            {
              status,
              reason: "",
              // A closed dispute with a live cooldown means "recently ruled".
              cooldownSeconds: open ? 0 : cooldown
            }
          ])
        }
        if (!cancelled) setDisputeStates(new Map(entries))
      } catch {
        // Non-fatal: the dispute affordance simply stays hidden.
      }
    }

    void loadDisputes()
    return () => {
      cancelled = true
    }
  }, [address, questId, milestones])

  const handleOpenDispute = useCallback(
    async (milestoneId: number, reason: string) => {
      if (!address) return
      setIsDisputePending(true)
      try {
        await milestoneClient.openDispute(address, questId, milestoneId, reason, {
          onSigning: () => addToast("Opening dispute…", "info"),
          onSuccess: () => {
            addToast("Dispute opened. The quest owner will review it.", "success")
            setDisputeStates(
              prev =>
                new Map(prev).set(milestoneId, { status: 0, reason, cooldownSeconds: 0 })
            )
          },
          onError: err => addToast(String(err), "error", 5000)
        })
      } catch (err) {
        addToast(err instanceof Error ? err.message : String(err), "error", 5000)
      } finally {
        setIsDisputePending(false)
      }
    },
    [address, questId, addToast]
  )

  const handleResolveDispute = useCallback(
    async (
      milestoneId: number,
      enrollee: string,
      outcome: DisputeOutcome,
      note?: string
    ) => {
      if (!address) return
      setIsDisputePending(true)
      try {
        await milestoneClient.resolveDispute(
          address,
          questId,
          milestoneId,
          enrollee,
          outcome,
          note,
          {
            onSuccess: () => addToast("Dispute resolved.", "success"),
            onError: err => addToast(String(err), "error", 5000)
          }
        )
        setOwnerDisputes(prev => prev.filter(d => d.milestoneId !== milestoneId))
        setDisputeStates(prev => {
          const next = new Map(prev)
          next.delete(milestoneId)
          return next
        })
      } catch (err) {
        addToast(err instanceof Error ? err.message : String(err), "error", 5000)
      } finally {
        setIsDisputePending(false)
      }
    },
    [address, questId, addToast]
  )

  return {
    disputeStates,
    ownerDisputes,
    isQuestOwner,
    isDisputePending,
    handleOpenDispute,
    handleResolveDispute,
  }
}
