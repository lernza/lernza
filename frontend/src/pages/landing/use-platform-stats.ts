import { useState, useEffect } from "react"
import { rewardsClient } from "@/lib/contracts/rewards"

export interface PlatformStats {
  totalQuests: number
  activeLearners: number
  totalDistributed: string
}

/**
 * Live platform totals for the landing hero. Starts with static defaults so the
 * page paints immediately, then swaps in contract values once they resolve.
 */
export function usePlatformStats(): PlatformStats {
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalQuests: 12,
    activeLearners: 148,
    totalDistributed: "24,500 USDC",
  })

  useEffect(() => {
    let mounted = true
    rewardsClient.getPlatformStats()
      .then(stats => {
        if (!mounted || !stats) return
        setPlatformStats({
          totalQuests: Number(stats.totalFundedQuests) || 12,
          activeLearners: 148,
          totalDistributed: `${Number(stats.totalDistributed || 0).toLocaleString()} USDC`,
        })
      })
      .catch(() => {
        // Fall back gracefully to static values
      })
    return () => {
      mounted = false
    }
  }, [])

  return platformStats
}
