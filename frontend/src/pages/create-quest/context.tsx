import { createContext, useContext, useState, type ReactNode, useCallback } from "react"
import type { Step1Values, Step2Values, FormStep } from "./types"
import { templateToStep1, templateToMilestones, type QuestTemplate } from "./quest-templates"

interface QuestCreationContextType {
  step1Data: Step1Values
  setStep1Data: (data: Step1Values) => void
  step2Data: Step2Values
  setStep2Data: (data: Step2Values) => void
  currentStep: FormStep
  goToNext: () => void
  goToBack: () => void
  setCurrentStep: (step: FormStep) => void
  /** ID of the template that was last applied, or null if none. */
  appliedTemplateId: string | null
  /**
   * Alias for appliedTemplateId — kept for backwards compatibility with the
   * legacy templates.test.tsx that destructures `selectedTemplateId`.
   */
  selectedTemplateId: string | null
  /**
   * Apply a template: populate step1 and step2 data, record the template id,
   * and navigate to step 1 so the user can review and edit.
   */
  applyTemplate: (template: QuestTemplate) => void
}

const QuestCreationContext = createContext<QuestCreationContextType | undefined>(undefined)

export function QuestCreationProvider({ children }: { children: ReactNode }) {
  const [step1Data, setStep1Data] = useState<Step1Values>({
    name: "",
    description: "",
    category: "",
    tags: [],
  })
  const [step2Data, setStep2Data] = useState<Step2Values>({
    milestones: [{ title: "", description: "", rewardAmount: 0 }],
  })
  const [currentStep, setCurrentStep] = useState<FormStep>(1)
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null)

  const goToNext = useCallback(() => {
    setCurrentStep(prev => (prev + 1) as FormStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const goToBack = useCallback(() => {
    setCurrentStep(prev => (prev - 1) as FormStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const applyTemplate = useCallback((template: QuestTemplate) => {
    setStep1Data(templateToStep1(template))
    setStep2Data({ milestones: templateToMilestones(template) })
    setAppliedTemplateId(template.id)
    setCurrentStep(1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const value: QuestCreationContextType = {
    step1Data,
    setStep1Data,
    step2Data,
    setStep2Data,
    currentStep,
    goToNext,
    goToBack,
    setCurrentStep,
    appliedTemplateId,
    // selectedTemplateId is the same value — legacy alias
    selectedTemplateId: appliedTemplateId,
    applyTemplate,
  }

  return <QuestCreationContext.Provider value={value}>{children}</QuestCreationContext.Provider>
}

export function useQuestCreation() {
  const context = useContext(QuestCreationContext)
  if (!context) {
    throw new Error("useQuestCreation must be used within a QuestCreationProvider")
  }
  return context
}
