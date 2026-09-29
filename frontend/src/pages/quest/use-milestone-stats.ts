import { useMemo } from "react"

export interface MilestoneStat {
  id: number
  rewardAmount: bigint
}

export interface Completion {
  milestoneId: number
  enrollee: string
  completed: boolean
}

export interface MilestoneStats {
  totalReward: number
  completedMilestones: number
  isComplete: boolean
  earnedReward: number
}

/** Reward/progress totals derived from the milestone list and completion map. */
export function useMilestoneStats(
  milestones: MilestoneStat[],
  completions: Completion[]
): MilestoneStats {
  return useMemo(() => {
    const total = milestones.reduce((sum, m) => sum + Number(m.rewardAmount), 0)
    const completedSet = new Set(completions.filter(c => c.completed).map(c => c.milestoneId))
    const completed = completedSet.size
    return {
      totalReward: total,
      completedMilestones: completed,
      isComplete: completed === milestones.length && milestones.length > 0,
      earnedReward: milestones
        .filter(m => completedSet.has(m.id))
        .reduce((sum, m) => sum + Number(m.rewardAmount), 0),
    }
  }, [milestones, completions])
}
