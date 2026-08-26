import { useEffect } from "react"
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { useWallet } from "@/hooks/use-wallet"
import { OnboardingTutorialProps } from "./onboarding-tutorial-props"

export function OnboardingTutorial({
  isOpen,
  currentStep,
  onClose,
  onComplete,
  onNext,
  onBack
}: {
  isOpen: boolean
  currentStep: number
  onClose: () => void
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}) {
  const { theme } = useColorScheme()
  const { connected } = useWallet()

  const learnerSteps: Step[] = [
    {
      target: "body",
      content: "Welcome to Lernza! This quick tour will show you how to earn tokens by learning.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "[data-onboarding='connect-wallet']",
      content: "First, connect your Freighter wallet. This acts as your identity on the Stellar network.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-onboarding='nav-dashboard']",
      content: "Browse available quests here. You'll find tasks and milestones to complete.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-onboarding='quest-card']",
      content: "Click on any quest to view its details.",
      placement: "top",
      disableBeacon: true,
    },
    {
      target: "[data-onboarding='quest-enroll']",
      content: "Once you find a quest you like, click Enroll to start your journey and earn rewards!",
      placement: "top",
      disableBeacon: true,
    },
  ]

  const creatorSteps: Step[] = [
    {
      target: "body",
      content: "Welcome, Creator! Let's see how you can set up a quest.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "[data-onboarding='nav-create-quest']",
      content: "Start by creating a new quest here.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "[data-onboarding='add-milestones']",
      content: "Add milestones that learners need to complete.",
      placement: "top",
      disableBeacon: true,
    },
    {
      target: "[data-onboarding='fund-rewards']",
      content: "Fund your quest with tokens to reward learners upon completion.",
      placement: "top",
      disableBeacon: true,
    },
  ]

  const steps = [...learnerSteps, ...creatorSteps]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data
    
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
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#FACC15",
          backgroundColor: theme === "dark" ? "#1A1A1A" : "#FFFFFF",
          textColor: theme === "dark" ? "#FFFFFF" : "#000000",
          zIndex: 9999,
        },
      }}
    />
  )
}
