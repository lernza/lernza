import { Award, Gem, Medal, Sparkles, Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { type BadgeProps } from "@/components/ui/badge"
import { getTierVariant } from "@/components/reputation-badge.variants"
import { type ReputationSummary, type ReputationTier } from "@/lib/reputation"
import { cn } from "@/lib/utils"

const TIER_ICON: Record<ReputationTier, typeof Award> = {
  Newcomer: Sparkles,
  Bronze: Medal,
  Silver: Award,
  Gold: Trophy,
  Platinum: Gem,
}

/** Confidence below this is surfaced as a "provisional" hint. */
const PROVISIONAL_BELOW = 0.5

interface ReputationBadgeProps {
  summary: ReputationSummary
  /** Whether to render the numeric score next to the tier. Defaults to true. */
  showScore?: boolean
  size?: BadgeProps["size"]
  className?: string
}

/**
 * Reputation badge. Renders a user's reputation {@link ReputationTier} with an
 * accompanying icon and, optionally, their numeric score. Scores backed by
 * little history are flagged as "provisional" so viewers can weigh them
 * accordingly.
 */
export function ReputationBadge({
  summary,
  showScore = true,
  size,
  className,
}: ReputationBadgeProps) {
  const Icon = TIER_ICON[summary.tier]
  const provisional = summary.confidence < PROVISIONAL_BELOW

  const label = provisional ? `${summary.tier} · provisional` : summary.tier
  const ariaLabel = `Reputation: ${summary.tier}, score ${summary.score} out of 1000${
    provisional ? ", provisional" : ""
  }`

  return (
    <Badge
      variant={getTierVariant(summary.tier)}
      size={size}
      className={cn("gap-1", className)}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
      {showScore && <span className="opacity-80">{summary.score}</span>}
    </Badge>
  )
}
