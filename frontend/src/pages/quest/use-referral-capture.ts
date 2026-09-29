import { useEffect } from "react"
import { storePendingReferral } from "@/lib/referrals"

/**
 * Captures a `?ref=` query parameter on mount so a referral is credited to the
 * learner who arrives through a shared link.
 */
export function useReferralCapture(questId: number) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")
      if (ref) {
        storePendingReferral(questId, ref)
      }
    }
  }, [questId])
}
