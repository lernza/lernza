import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n"
import type { UseOnboardingReturn } from "@/hooks/use-onboarding"

export interface OnboardingBannerProps {
  onboarding: UseOnboardingReturn
}

/** Getting Started banner shown above the dashboard until onboarding is completed. */
export function OnboardingBanner({ onboarding }: OnboardingBannerProps) {
  const { t } = useTranslation()

  if (onboarding?.completed) return null
  return (
    <div className="bg-primary text-primary-foreground mb-8 flex flex-col items-center justify-between p-6 shadow-lg sm:flex-row">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5" /> {t("dashboard.getStarted")}
        </h2>
        <p className="text-primary-foreground/80 mt-1">{t("dashboard.getStartedBody")}</p>
      </div>
      <div className="mt-4 flex gap-3 sm:mt-0">
        <Button
          variant="secondary"
          onClick={() => onboarding?.open?.(0)}
          className="font-bold"
          aria-label={t("dashboard.startLearnerTour")}
        >
          {t("dashboard.learnerTour")}
        </Button>
        <Button
          variant="outline"
          onClick={() => onboarding?.open?.(5)}
          className="border-primary-foreground hover:bg-primary-foreground/10 text-primary-foreground bg-transparent"
          aria-label={t("dashboard.startCreatorTour")}
        >
          {t("dashboard.creatorTour")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onboarding?.complete?.()}
          className="hover:bg-primary-foreground/10 text-primary-foreground"
          aria-label={t("dashboard.dismissBanner")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
