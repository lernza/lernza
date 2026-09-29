import {
  UserPlus,
  Edit3,
  Trophy,
  Coins,
  ArrowRight,
  Sparkles,
  Eye,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface EmptyProfileOnboardingProps {
  onStartEdit: () => void
  onBrowseQuests?: () => void
  walletAddress: string
  hasEnrolledQuests?: boolean
  hasCompletedQuests?: boolean
  hasRewards?: boolean
}

interface OnboardingStep {
  icon: typeof Edit3
  title: string
  description: string
  action?: string
  done: boolean
}

export function EmptyProfileOnboarding({
  onStartEdit,
  onBrowseQuests,
  walletAddress,
  hasEnrolledQuests = false,
  hasCompletedQuests = false,
  hasRewards = false,
}: EmptyProfileOnboardingProps) {
  const steps: OnboardingStep[] = [
    {
      icon: Edit3,
      title: "Add your profile info",
      description: "Add a display name, bio, and social links so others can recognize you.",
      action: "Customize profile",
      done: false,
    },
    {
      icon: Trophy,
      title: "Complete quests",
      description: "Finish milestones to unlock achievements and showcase your work.",
      done: hasCompletedQuests,
    },
    {
      icon: Coins,
      title: "Earn rewards",
      description: "Verified completions earn USDC rewards directly to your wallet.",
      done: hasRewards,
    },
  ]

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Unknown"

  return (
    <div className="relative overflow-hidden">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative">
        <Card className="border-border overflow-hidden border shadow-xl">
          <div className="bg-gradient-to-br from-accent/20 via-accent/5 to-background p-8 sm:p-10">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="animate-float bg-accent border-border mb-6 flex h-20 w-20 items-center justify-center border-2 shadow-lg">
                <UserPlus className="h-10 w-10" />
              </div>

              <Badge variant="default" className="mb-4 gap-1.5 shadow-sm">
                <Sparkles className="h-3 w-3" />
                New Learner Profile
              </Badge>

              <h1 className="mb-2 text-3xl font-bold sm:text-4xl">
                Welcome to Lernza, <span className="text-muted-foreground font-mono text-2xl sm:text-3xl">{shortAddress}</span>
              </h1>
              <p className="text-muted-foreground mb-8 max-w-xl text-sm font-bold sm:text-base">
                Your profile is currently empty. Customize it to showcase your learning journey, completed quests, and earnings to the community.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <Button size="lg" onClick={onStartEdit} className="shadow-md">
                  <Edit3 className="h-4 w-4" />
                  Customize Your Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {onBrowseQuests && (
                  <Button size="lg" variant="outline" onClick={onBrowseQuests}>
                    <Trophy className="h-4 w-4" />
                    Browse Quests
                  </Button>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Complete your profile setup</h2>
                <p className="text-muted-foreground text-sm font-bold">
                  Follow these steps to get the most out of Lernza
                </p>
              </div>
              <Badge variant="outline" className="border font-bold">
                {steps.filter(s => s.done).length}/{steps.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {steps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <Card
                    key={idx}
                    className={
                      step.done
                        ? "border-success/30 bg-success/5 shadow-md"
                        : "border-border bg-card shadow-sm"
                    }
                  >
                    <CardContent className="p-5">
                      <div className="mb-4 flex items-start justify-between">
                        <div
                          className={
                            step.done
                              ? "bg-success border-success/30 flex h-10 w-10 items-center justify-center border shadow-sm"
                              : "bg-secondary border-border flex h-10 w-10 items-center justify-center border shadow-sm"
                          }
                        >
                          {step.done ? (
                            <CheckCircle2 className="text-white h-5 w-5" />
                          ) : (
                            <Icon
                              className={
                                step.done ? "text-success h-5 w-5" : "h-5 w-5"
                              }
                            />
                          )}
                        </div>
                        <Badge
                          variant={step.done ? "success" : "secondary"}
                          className="text-[10px] font-bold shadow-sm"
                        >
                          Step {idx + 1}
                        </Badge>
                      </div>
                      <h3 className="mb-1.5 font-semibold">{step.title}</h3>
                      <p className="text-muted-foreground mb-4 text-xs font-bold leading-relaxed">
                        {step.description}
                      </p>
                      {step.action && !step.done && (
                        <Button
                          size="sm"
                          variant={step.done ? "outline" : "secondary"}
                          onClick={idx === 0 ? onStartEdit : undefined}
                          className="w-full text-xs font-bold gap-1"
                        >
                          {step.action}
                          {!step.done && <ArrowRight className="h-3 w-3" />}
                        </Button>
                      )}
                      {step.done && (
                        <div className="flex items-center gap-1.5 text-success text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completed
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="border-border mt-8 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-secondary border-border flex h-10 w-10 shrink-0 items-center justify-center border shadow-sm">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Privacy by default</h4>
                  <p className="text-muted-foreground text-xs font-bold">
                    You control every aspect of your profile. Choose what is public, visible only to connections, or completely private.
                    Your wallet address is always visible, but submission details are never exposed without your consent.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
