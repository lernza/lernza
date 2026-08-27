import { type BadgeProps } from "@/components/ui/badge"
import { type ReputationTier } from "@/lib/reputation"

type BadgeVariant = NonNullable<BadgeProps["variant"]>

const TIER_VARIANT: Record<ReputationTier, BadgeVariant> = {
  Newcomer: "outline",
  Bronze: "warning",
  Silver: "secondary",
  Gold: "default",
  Platinum: "verified",
}

export function getTierVariant(tier: ReputationTier): BadgeVariant {
  return TIER_VARIANT[tier]
}
