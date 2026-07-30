import { useState, useCallback } from "react"

const STORAGE_KEY = "lernza_onboarding_completed"
const STORAGE_STEP_KEY = "lernza_onboarding_step"

export interface OnboardingStep {
  id: string
  title: string
  description: string
  /** Optional highlight element selector (for future spotlight support) */
  target?: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Lernza 👋",
    description:
      "Lernza is a learn-to-earn platform built on Stellar. Creators fund Quests with real tokens — you complete milestones and earn them. Let's walk you through how it works.",
  },
  {
    id: "connect-wallet",
    title: "Connect Your Wallet",
    description:
      "Install the Freighter browser extension and connect to Stellar Testnet. Your wallet is your identity — no accounts, no passwords. Just your keys.",
    target: "[data-onboarding='connect-wallet']",
  },
  {
    id: "browse-quests",
    title: "Browse Available Quests",
    description:
      "Head to the Dashboard to see all open quests. Each quest has a title, description, a reward pool funded with tokens, and a set of milestones you need to complete.",
    target: "[data-onboarding='dashboard-link']",
  },
  {
    id: "enroll",
    title: "Enroll in a Quest",
    description:
      "Click into any quest and hit Enroll. Once enrolled, the quest owner can also invite you directly. Enrollment is recorded on-chain — no backing out required.",
    target: "[data-onboarding='quest-enroll']",
  },
  {
    id: "complete-milestones",
    title: "Complete Milestones",
    description:
      "Each quest has milestones — specific tasks like 'Deploy a smart contract' or 'Build your first API'. Complete them off-chain, then the quest owner verifies your work on-chain.",
    target: "[data-onboarding='milestones']",
  },
  {
    id: "earn-rewards",
    title: "Earn Your Rewards 🎉",
    description:
      "After a milestone is verified, the quest owner distributes your reward directly to your wallet. Tokens are locked in the reward pool up front — no trust needed.",
    target: "[data-onboarding='rewards']",
  },
]

export const TOTAL_STEPS = ONBOARDING_STEPS.length

function readCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function readSavedStep(): number {
  try {
    const raw = localStorage.getItem(STORAGE_STEP_KEY)
    if (raw === null) return 0
    const parsed = parseInt(raw, 10)
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, TOTAL_STEPS - 1))
  } catch {
    return 0
  }
}

function persistCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, "true")
    localStorage.removeItem(STORAGE_STEP_KEY)
  } catch {
    // localStorage unavailable — best effort only.
  }
}

function persistStep(step: number) {
  try {
    localStorage.setItem(STORAGE_STEP_KEY, String(step))
  } catch {
    // localStorage unavailable — best effort only.
  }
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_STEP_KEY)
  } catch {
    // localStorage unavailable — best effort only.
  }
}

export interface UseOnboardingReturn {
  /** Whether the tutorial modal is currently visible */
  isOpen: boolean
  /** Index of the currently displayed step (0-based) */
  currentStep: number
  /** The step data for the current step */
  step: OnboardingStep
  /** Total number of steps */
  totalSteps: number
  /** Whether the user has already completed / dismissed the tutorial */
  completed: boolean
  /** Whether this is the last step */
  isLastStep: boolean
  /** Whether this is the first step */
  isFirstStep: boolean
  /** Open the tutorial (optionally from a specific step) */
  open: (step?: number) => void
  /** Close without marking complete */
  close: () => void
  /** Advance one step (closes and completes on the last step) */
  next: () => void
  /** Go back one step */
  back: () => void
  /** Skip and dismiss the tutorial permanently */
  skip: () => void
  /** Mark as complete and close */
  complete: () => void
  /** Reset so it will show again on next open */
  reset: () => void
}

/**
 * Manages the guided onboarding tutorial state.
 * Progress is persisted to localStorage so the user can resume where they left off.
 */
export function useOnboarding(): UseOnboardingReturn {
  const [completed, setCompleted] = useState<boolean>(readCompleted)
  const [currentStep, setCurrentStep] = useState<number>(readSavedStep)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(
    (step?: number) => {
      if (step !== undefined) {
        const clamped = Math.max(0, Math.min(step, TOTAL_STEPS - 1))
        setCurrentStep(clamped)
        persistStep(clamped)
      }
      setCompleted(false)
      setIsOpen(true)
    },
    []
  )

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const skip = useCallback(() => {
    setIsOpen(false)
    setCompleted(true)
    persistCompleted()
  }, [])

  const complete = useCallback(() => {
    setIsOpen(false)
    setCompleted(true)
    persistCompleted()
  }, [])

  const next = useCallback(() => {
    setCurrentStep(prev => {
      const nextStep = prev + 1
      if (nextStep >= TOTAL_STEPS) {
        // Complete the tutorial
        setIsOpen(false)
        setCompleted(true)
        persistCompleted()
        return prev
      }
      persistStep(nextStep)
      return nextStep
    })
  }, [])

  const back = useCallback(() => {
    setCurrentStep(prev => {
      const prevStep = Math.max(0, prev - 1)
      persistStep(prevStep)
      return prevStep
    })
  }, [])

  const reset = useCallback(() => {
    setCompleted(false)
    setCurrentStep(0)
    clearPersisted()
  }, [])

  return {
    isOpen,
    currentStep,
    step: ONBOARDING_STEPS[currentStep],
    totalSteps: TOTAL_STEPS,
    completed,
    isLastStep: currentStep === TOTAL_STEPS - 1,
    isFirstStep: currentStep === 0,
    open,
    close,
    next,
    back,
    skip,
    complete,
    reset,
  }
}
