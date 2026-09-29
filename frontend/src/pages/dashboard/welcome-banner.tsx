import { Plus, Sparkles, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PrefetchLink } from "@/components/PrefetchLink"
import { useTranslation } from "@/i18n"

export interface WelcomeBannerProps {
  connected: boolean
  address?: string
  shortAddress?: string
  questsEnrolled: number
  onCreateQuest: () => void
  onLaunchTutorial?: () => void
}

/** Dashboard hero: greets the visitor and hosts the primary create/tour actions. */
export function WelcomeBanner({
  connected,
  address,
  shortAddress,
  questsEnrolled,
  onCreateQuest,
  onLaunchTutorial,
}: WelcomeBannerProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-accent border-border animate-fade-in-up relative mb-8 overflow-hidden border p-6 shadow-lg sm:p-8">
      <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-bold tracking-wider uppercase">
              {connected ? t("dashboard.welcomeBack") : t("dashboard.welcome")}
            </span>
          </div>
          {connected ? (
            <PrefetchLink to={`/creator/${address}`}>
              <h1 className="hover:text-background/80 text-3xl font-semibold transition-colors sm:text-4xl">
                {shortAddress}
              </h1>
            </PrefetchLink>
          ) : (
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {t("dashboard.discoverQuests")}
            </h1>
          )}
          <p className="mt-1 text-sm font-bold opacity-70">
            {connected
              ? t("dashboard.activeQuests", { count: questsEnrolled })
              : t("dashboard.explorePaths")}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={onCreateQuest}
          className="shimmer-on-hover group flex-shrink-0"
          data-onboarding="nav-create-quest"
        >
          <Plus className="h-4 w-4" />
          {t("dashboard.createQuest")}
        </Button>
        {onLaunchTutorial && (
          <Button
            variant="outline"
            onClick={onLaunchTutorial}
            data-onboarding="tutorial-button"
            className="flex flex-shrink-0 items-center gap-2"
            aria-label={t("nav.openTutorial")}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t("dashboard.takeTour")}
          </Button>
        )}
      </div>
    </div>
  )
}
