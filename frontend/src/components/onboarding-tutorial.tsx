import { useEffect } from "react"
import { ArrowRight, ArrowLeft, X, BookOpen, Wallet, LayoutDashboard, Users, CheckSquare, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "@/hooks/use-onboarding"

// ─── Step icon map ────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: BookOpen,
  "connect-wallet": Wallet,
  "browse-quests": LayoutDashboard,
  enroll: Users,
  "complete-milestones": CheckSquare,
  "earn-rewards": Coins,
}

// ─── Step dot progress indicator ─────────────────────────────────────────────

interface StepDotsProps {
  total: number
  current: number
  onJump: (index: number) => void
}

function StepDots({ total, current, onJump }: StepDotsProps) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Tutorial steps">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === current}
          aria-label={`Step ${i + 1}`}
          onClick={() => onJump(i)}
          className={cn(
            "border-border cursor-pointer border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            i === current
              ? "bg-accent h-2.5 w-6"
              : i < current
                ? "bg-foreground/40 h-2.5 w-2.5 hover:bg-foreground/60"
                : "bg-muted h-2.5 w-2.5 hover:bg-muted-foreground/40"
          )}
        />
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OnboardingTutorialProps {
  isOpen: boolean
  currentStep: number
  step: OnboardingStep
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onComplete: () => void
  onClose: () => void
  onJumpTo: (index: number) => void
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Full-screen overlay tutorial that guides new users through Lernza's
 * quest participation and earning mechanics.
 */
export function OnboardingTutorial({
  isOpen,
  currentStep,
  step,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onBack,
  onSkip,
  onComplete,
  onClose,
  onJumpTo,
}: OnboardingTutorialProps) {
  // Prevent body scroll while the tutorial is open
  useScrollLock(isOpen)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const StepIcon = STEP_ICONS[step.id] ?? BookOpen
  const progressPct = ((currentStep + 1) / totalSteps) * 100

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lernza onboarding tutorial"
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 sm:p-8"
    >
      {/* Dimmed overlay — clicking it closes the tutorial */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        className={cn(
          "bg-card text-card-foreground border-border relative z-10 w-full max-w-lg border shadow-xl",
          "animate-fade-in-up"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Progress bar ── */}
        <div className="bg-muted border-border h-1.5 w-full border-b">
          <div
            className="bg-accent h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
          />
        </div>

        {/* ── Header ── */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Getting started — {currentStep + 1} / {totalSteps}
          </span>
          <button
            onClick={onClose}
            aria-label="Close tutorial"
            className="border-border hover:bg-secondary neo-press flex h-8 w-8 cursor-pointer items-center justify-center border transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-8">
          {/* Icon */}
          <div
            className="bg-accent/10 border-border mb-6 flex h-14 w-14 items-center justify-center border"
            aria-hidden="true"
          >
            <StepIcon className="text-accent h-7 w-7" />
          </div>

          {/* Text */}
          <h2 className="mb-3 text-2xl font-bold tracking-tight">{step.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* ── Footer ── */}
        <div className="border-border flex flex-col gap-4 border-t px-6 py-5">
          {/* Step dots */}
          <div className="flex items-center justify-between">
            <StepDots total={totalSteps} current={currentStep} onJump={onJumpTo} />
            {/* Close/skip link — only visible when not on last step */}
            {!isLastStep && (
              <button
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium underline-offset-2 transition-colors hover:underline"
              >
                Close and skip
              </button>
            )}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onBack}
                aria-label="Previous step"
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            )}

            <Button
              size="sm"
              onClick={isLastStep ? onComplete : onNext}
              aria-label={isLastStep ? "Start earning — complete tutorial" : "Next step"}
              className="ml-auto flex items-center gap-1.5"
            >
              {isLastStep ? (
                <>
                  Start earning
                  <Coins className="h-4 w-4" aria-hidden="true" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
