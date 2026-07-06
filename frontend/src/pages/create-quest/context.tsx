import { createContext, useContext, useState, ReactNode, useCallback } from "react"
import { Step1Values, Step2Values, FormStep } from "./types"

interface QuestCreationContextType {
  step1Data: Step1Values
  setStep1Data: (data: Step1Values) => void
  step2Data: Step2Values
  setStep2Data: (data: Step2Values) => void
  currentStep: FormStep
  goToNext: () => void
  goToBack: () => void
  setCurrentStep: (step: FormStep) => void
}

const QuestCreationContext = createContext<QuestCreationContextType | undefined>(undefined)

export function QuestCreationProvider({ children }: { children: ReactNode }) {
  const [step1Data, setStep1Data] = useState<Step1Values>({
    name: "",
    description: "",
  })
  const [step2Data, setStep2Data] = useState<Step2Values>({
    milestones: [{ title: "", description: "", rewardAmount: 0 }],
  })
  const [currentStep, setCurrentStep] = useState<FormStep>(1)

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) as FormStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const goToBack = useCallback(() => {
    setCurrentStep((prev) => (prev - 1) as FormStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const value = {
    step1Data,
    setStep1Data,
    step2Data,
    setStep2Data,
    currentStep,
    goToNext,
    goToBack,
    setCurrentStep,
  }

  return (
    <QuestCreationContext.Provider value={value}>
      {children}
    </QuestCreationContext.Provider>
  )
}

export function useQuestCreation() {
  const context = useContext(QuestCreationContext)
  if (!context) {
    throw new Error("useQuestCreation must be used within a QuestCreationProvider")
  }
  return context
}
