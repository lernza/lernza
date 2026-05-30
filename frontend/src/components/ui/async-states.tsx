import { Loader2, AlertCircle, Search, Wallet, Coins, Target, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ─── Loading States ─────────────────────────────────────────────────────────────

interface LoadingStateProps {
  /** Contextual message — callers must provide one (e.g. "Fetching quests", "Confirming transaction"). */
  message: string
  variant?: "default" | "compact" | "inline"
}

export function LoadingState({ message, variant = "default" }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm font-bold">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-bold">{message}</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in-up">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="bg-muted border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
        <h3 className="mb-2 font-black">{message}</h3>
        <p className="text-muted-foreground text-sm">Fetching on-chain data, please wait...</p>
      </CardContent>
    </Card>
  )
}

// ─── Error States ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  variant?: "default" | "compact" | "inline"
  icon?: React.ComponentType<{ className?: string }>
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
  variant = "default",
  icon: IconComponent,
}: ErrorStateProps) {
  const ErrorIcon = IconComponent || AlertCircle

  if (variant === "inline") {
    return (
      <div className="text-destructive flex items-center gap-2 text-sm font-bold">
        <ErrorIcon className="h-4 w-4" />
        {message}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-4">
          <ErrorIcon className="text-destructive h-4 w-4" />
          <span className="text-destructive text-sm font-bold">{message}</span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in-up">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="bg-destructive/10 border-destructive mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
          <ErrorIcon className="text-destructive h-6 w-6" />
        </div>
        <h3 className="mb-2 font-black">Error</h3>
        <p className="text-muted-foreground mb-4 max-w-md text-sm">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} className="shimmer-on-hover">
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Empty States ─────────────────────────────────────────────────────────────

/**
 * Variants that render a CTA button require an explicit handler so the button
 * is never dead. The discriminated union makes the compiler enforce this:
 *
 *   variant="wallet"     → onConnect required
 *   variant="quests"     → onCreateQuest required
 *   variant="milestones" → onAddMilestone required
 *   variant="enrollees"  → onAddEnrollee required
 *   variant="earnings"   → no CTA (read-only state)
 *   variant="compact"    → optional generic action prop (unchanged)
 *   variant="default"    → optional generic action prop (unchanged)
 */

// Variants that own their CTA label/handler — callers may not pass a generic `action`.
interface WalletEmptyStateProps {
  variant: "wallet"
  onConnect: () => void
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  illustration?: "dashboard" | "profile" | "leaderboard"
  // action intentionally omitted — use onConnect
}

interface QuestsEmptyStateProps {
  variant: "quests"
  onCreateQuest: () => void
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  illustration?: "dashboard" | "profile" | "leaderboard"
}

interface MilestonesEmptyStateProps {
  variant: "milestones"
  onAddMilestone: () => void
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  illustration?: "dashboard" | "profile" | "leaderboard"
}

interface EnrolleesEmptyStateProps {
  variant: "enrollees"
  onAddEnrollee: () => void
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  illustration?: "dashboard" | "profile" | "leaderboard"
}

// Variants with no CTA or a generic optional action.
interface EarningsEmptyStateProps {
  variant: "earnings"
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  illustration?: "dashboard" | "profile" | "leaderboard"
}

interface DefaultEmptyStateProps {
  variant?: "default" | "compact"
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  illustration?: "dashboard" | "profile" | "leaderboard"
  /** Generic escape hatch for one-off CTAs on default/compact variants. */
  action?: { label: string; onClick: () => void }
}

type EmptyStateProps =
  | WalletEmptyStateProps
  | QuestsEmptyStateProps
  | MilestonesEmptyStateProps
  | EnrolleesEmptyStateProps
  | EarningsEmptyStateProps
  | DefaultEmptyStateProps

export function EmptyState(props: EmptyStateProps) {
  const { title, description, icon: IconComponent, illustration } = props

  // Resolve per-variant config — handler is always defined when a CTA is shown.
  const getVariantConfig = (): {
    title: string
    description: string
    icon: React.ReactNode
    cta?: { label: string; onClick: () => void }
  } => {
    switch (props.variant) {
      case "quests":
        return {
          title: title || "No quests yet",
          description:
            description ||
            "Create your first quest to start incentivizing learning with on-chain rewards.",
          icon: IconComponent ? (
            <IconComponent className="h-6 w-6" />
          ) : (
            <Target className="h-6 w-6" />
          ),
          cta: { label: "Create Quest", onClick: props.onCreateQuest },
        }
      case "milestones":
        return {
          title: title || "No milestones yet",
          description: description || "Add milestones to define learning goals.",
          icon: IconComponent ? (
            <IconComponent className="h-6 w-6" />
          ) : (
            <Target className="h-6 w-6" />
          ),
          cta: { label: "Add Milestone", onClick: props.onAddMilestone },
        }
      case "enrollees":
        return {
          title: title || "No enrollees yet",
          description: description || "Add learners to this quest.",
          icon: IconComponent ? (
            <IconComponent className="h-6 w-6" />
          ) : (
            <Users className="h-6 w-6" />
          ),
          cta: { label: "Add Enrollee", onClick: props.onAddEnrollee },
        }
      case "earnings":
        return {
          title: title || "No on-chain earnings yet",
          description:
            description || "Your wallet has not received rewards from the rewards contract yet.",
          icon: IconComponent ? (
            <IconComponent className="h-6 w-6" />
          ) : (
            <Coins className="h-6 w-6" />
          ),
          // No CTA — earnings is a read-only state.
        }
      case "wallet":
        return {
          title: title || "Connect your wallet",
          description:
            description ||
            "Connect your Freighter wallet to view your quests, track your progress, and start earning USDC.",
          icon: IconComponent ? (
            <IconComponent className="h-6 w-6" />
          ) : (
            <Wallet className="h-6 w-6" />
          ),
          cta: { label: "Connect Wallet", onClick: props.onConnect },
        }
      default: {
        // "default" | "compact" | undefined
        const action = (props as DefaultEmptyStateProps).action
        return {
          title: title || "No data",
          description: description || "No items to display.",
          icon: IconComponent ? (
            <IconComponent className="h-6 w-6" />
          ) : (
            <Search className="h-6 w-6" />
          ),
          cta: action ? { label: action.label, onClick: action.onClick } : undefined,
        }
      }
    }
  }

  const config = getVariantConfig()

  const illustrationSrc = illustration ? `/illustrations/empty-${illustration}.svg` : null

  if (props.variant === "compact") {
    const action = (props as DefaultEmptyStateProps).action
    return (
      <Card className="animate-fade-in-up">
        <CardContent className="flex items-center gap-3 py-4">
          {/* compact: h-10 w-10 container, icon h-6 w-6 — 1.6× ratio matching standalone */}
          <div className="bg-primary border-border flex h-10 w-10 shrink-0 items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)]">
            {config.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{config.title}</p>
            <p className="text-muted-foreground text-xs">{config.description}</p>
          </div>
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in-up">
      <CardContent className="flex flex-col items-center py-12 text-center">
        {illustrationSrc ? (
          <div className="mb-6">
            <img
              src={illustrationSrc}
              alt=""
              className="h-32 w-32 sm:h-40 sm:w-40"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="bg-primary border-border mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
            {config.icon}
          </div>
        )}
        <h3 className="mb-2 font-black">{config.title}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm text-sm">{config.description}</p>
        {config.cta && (
          <Button onClick={config.cta.onClick} className="shimmer-on-hover">
            {config.cta.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Contract States ───────────────────────────────────────────────────────────

interface ContractUnavailableProps {
  message?: string
  contract?: string
}

export function ContractUnavailable({
  message = "Contract is unavailable",
  contract = "this contract",
}: ContractUnavailableProps) {
  return (
    <Card className="animate-fade-in-up">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="bg-destructive/10 border-destructive mb-4 flex h-14 w-14 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
          <AlertCircle className="text-destructive h-6 w-6" />
        </div>
        <h3 className="mb-2 font-black">Contract unavailable</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          {message} {contract} is not configured or deployed on the current network.
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Preload Illustrations ─────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const preloads = [
    "/illustrations/empty-dashboard.svg",
    "/illustrations/empty-profile.svg",
    "/illustrations/empty-leaderboard.svg",
  ]
  preloads.forEach((src) => {
    const link = document.createElement("link")
    link.rel = "prefetch"
    link.as = "image"
    link.href = src
    document.head.appendChild(link)
  })
}
