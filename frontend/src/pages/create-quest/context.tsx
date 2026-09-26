import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react"
import type { Step1Values, Step2Values, FormStep } from "./types"
import type { QuestTemplate } from "./templates"

export const DRAFT_STORAGE_KEY = "lernza_quest_draft_v1"

export interface QuestDraftData {
  step1Data: Step1Values
  step2Data: Step2Values
  currentStep: FormStep
  updatedAt: number
  tabId: string
}

export interface QuestCreationContextType {
  step1Data: Step1Values
  setStep1Data: (data: Step1Values) => void
  step2Data: Step2Values
  setStep2Data: (data: Step2Values) => void
  currentStep: FormStep
  goToNext: () => void
  goToBack: () => void
  setCurrentStep: (step: FormStep) => void
  lastSaved: Date | null
  hasConflict: boolean
  hasDraftToRestore: boolean
  draftTimestamp: Date | null
  restoreDraft: () => void
  dismissDraft: () => void
  clearDraft: () => void
  saveDraft: () => void
  applyTemplate: (template: QuestTemplate) => void
  loadDraft: (step1: Step1Values, step2: Step2Values, currentStep: FormStep) => void
}

const QuestCreationContext = createContext<QuestCreationContextType | undefined>(undefined)

const DEFAULT_STEP1: Step1Values = {
  name: "",
  description: "",
  category: "",
  tags: [],
  referralBonus: 10,
}

const DEFAULT_STEP2: Step2Values = {
  milestones: [{ title: "", description: "", rewardAmount: 0, prerequisiteIds: [] }],
}

export function QuestCreationProvider({ children }: { children: ReactNode }) {
  const [step1Data, setStep1Data] = useState<Step1Values>(DEFAULT_STEP1)
  const [step2Data, setStep2Data] = useState<Step2Values>(DEFAULT_STEP2)
  const [currentStep, setCurrentStep] = useState<FormStep>(1)

  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasConflict, setHasConflict] = useState<boolean>(false)
  const [hasDraftToRestore, setHasDraftToRestore] = useState<boolean>(false)
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null)

  const tabIdRef = useRef<string>(
    typeof window !== "undefined"
      ? `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      : "server"
  )

  // Check for existing draft on initial mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as QuestDraftData
        const hasContent =
          Boolean(parsed.step1Data?.name?.trim()) ||
          Boolean(parsed.step1Data?.description?.trim()) ||
          Boolean(parsed.step2Data?.milestones?.some((m) => Boolean(m.title?.trim())))

        if (hasContent) {
          setHasDraftToRestore(true)
          if (parsed.updatedAt) {
            setDraftTimestamp(new Date(parsed.updatedAt))
          }
        }
      }
    } catch {
      // Ignore parse error
    }
  }, [])

  // Listen for storage events across other tabs to detect editing conflicts
  useEffect(() => {
    if (typeof window === "undefined") return
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DRAFT_STORAGE_KEY && e.newValue) {
        try {
          const remote = JSON.parse(e.newValue) as QuestDraftData
          if (remote.tabId && remote.tabId !== tabIdRef.current) {
            setHasConflict(true)
          }
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  // Manual or programmatic draft save
  const saveDraft = useCallback(() => {
    if (typeof window === "undefined") return
    const hasContent =
      Boolean(step1Data.name.trim()) ||
      Boolean(step1Data.description.trim()) ||
      step2Data.milestones.some((m) => Boolean(m.title.trim()))

    if (!hasContent) return

    const now = Date.now()
    const draft: QuestDraftData = {
      step1Data,
      step2Data,
      currentStep,
      updatedAt: now,
      tabId: tabIdRef.current,
    }

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      setLastSaved(new Date(now))
    } catch {
      // Storage quota or disabled
    }
  }, [step1Data, step2Data, currentStep])

  // Auto-save every 30 seconds during form editing
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft()
    }, 30_000)

    return () => clearInterval(timer)
  }, [saveDraft])

  const restoreDraft = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as QuestDraftData
        if (parsed.step1Data) setStep1Data(parsed.step1Data)
        if (parsed.step2Data) setStep2Data(parsed.step2Data)
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (parsed.updatedAt) setLastSaved(new Date(parsed.updatedAt))
      }
    } catch {
      // ignore
    } finally {
      setHasDraftToRestore(false)
      setHasConflict(false)
    }
  }, [])

  const dismissDraft = useCallback(() => {
    setHasDraftToRestore(false)
  }, [])

  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
    setHasDraftToRestore(false)
    setHasConflict(false)
    setLastSaved(null)
  }, [])

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) as FormStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const goToBack = useCallback(() => {
    setCurrentStep((prev) => (prev - 1) as FormStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])
  const loadDraft = useCallback((step1: Step1Values, step2: Step2Values, step: FormStep) => {
    setStep1Data(step1)
    setStep2Data(step2)
    setCurrentStep(step)
  }, [])

  const applyTemplate = useCallback((template: QuestTemplate) => {
    setStep1Data({ ...template.step1, tags: [...template.step1.tags] })
    setStep2Data({
      milestones: template.step2.milestones.map(milestone => ({ ...milestone })),
    })
    setCurrentStep(1)
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
    lastSaved,
    hasConflict,
    hasDraftToRestore,
    draftTimestamp,
    restoreDraft,
    dismissDraft,
    clearDraft,
    saveDraft,
    applyTemplate,
    loadDraft,
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
