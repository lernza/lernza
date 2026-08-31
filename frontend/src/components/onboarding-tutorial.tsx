import { Joyride, STATUS, type Step, type EventData } from "react-joyride"
import { useColorScheme } from "@/hooks/use-color-scheme"

export interface OnboardingTutorialProps {
  isOpen: boolean
  currentStep: number
  onClose: () => void
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

export function OnboardingTutorial({
  isOpen,
  currentStep,
  onComplete,
  onNext,
  onBack,
}: OnboardingTutorialProps) {
  const { theme } = useColorScheme()

  const learnerSteps: Step[] = [
    {
      target: "body",
      content: "Welcome to Lernza! This quick tour will show you how to earn tokens by learning.",
      placement: "center",
    },
    {
      target: "[data-onboarding='connect-wallet']",
      content:
        "First, connect your Freighter wallet. This acts as your identity on the Stellar network.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='nav-dashboard']",
      content: "Explore active quests, view your enrolled tracks, and track earnings here.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='quest-card']",
      content: "Click into any quest to view details, prerequisite milestones, and token pools.",
      placement: "right",
    },
    {
      target: "[data-onboarding='enroll-quest']",
      content: "Enroll into a quest to start submitting proof and claiming token rewards.",
      placement: "top",
    },
  ]

  const creatorSteps: Step[] = [
    {
      target: "[data-onboarding='create-quest']",
      content: "Ready to educate? Create your own quest, design milestones, and set incentives.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='step-basics']",
      content: "Name your quest, choose a category, and specify token rewards.",
      placement: "right",
    },
    {
      target: "[data-onboarding='step-milestones']",
      content: "Break the learning path down into bite-sized actionable milestones.",
      placement: "top",
    },
    {
      target: "[data-onboarding='fund-rewards']",
      content: "Fund your quest with tokens to reward learners upon completion.",
      placement: "top",
    },
  ]

  const steps = [...learnerSteps, ...creatorSteps]

  const handleJoyrideCallback = (data: EventData) => {
    const { action, status, type } = data

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      onComplete()
    } else if (type === "step:after" || type === "error") {
      if (action === "next") {
        onNext()
      } else if (action === "prev") {
        onBack()
      }
    }
  }

  return (
    <Joyride
      steps={steps}
      stepIndex={currentStep}
      run={isOpen}
      continuous
      scrollToFirstStep
      onEvent={handleJoyrideCallback}
      options={{
        primaryColor: "#FACC15",
        backgroundColor: theme === "dark" ? "#1A1A1A" : "#FFFFFF",
        textColor: theme === "dark" ? "#FFFFFF" : "#000000",
        zIndex: 9999,
        showProgress: true,
      }}
    />
  )
}
