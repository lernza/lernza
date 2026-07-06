import { useState, Suspense, lazy } from "react"
import { ArrowLeft, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { QuestCreationProvider, useQuestCreation } from "./context"
import { StepIndicator } from "./types"

const Step1Form = lazy(() => import("./step-1").then(m => ({ default: m.Step1Form })))
const Step2Form = lazy(() => import("./step-2").then(m => ({ default: m.Step2Form })))
const Step3Review = lazy(() => import("./step-3").then(m => ({ default: m.Step3Review })))

const StepFallback = () => (
  <div className="bg-muted border-border h-[400px] animate-pulse border shadow-md" />
)

interface CreateQuestProps {
  onBack: () => void
}

function CreateQuestContent({ onBack }: CreateQuestProps) {
  const { currentStep } = useQuestCreation()

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
      >
        <div className="border-border bg-background neo-press hover:bg-accent flex h-7 w-7 items-center justify-center border shadow-sm transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Page heading */}
      <div className="animate-fade-in-up relative mb-6">
        <h1 className="text-3xl font-semibold">Create a Quest</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set up milestones and fund the reward pool to incentivize learners.
        </p>
      </div>

      {/* Step indicator */}
      <div className="animate-fade-in-up stagger-1 relative">
        <StepIndicator current={currentStep} />
      </div>

      {/* Step content */}
      <div className="animate-fade-in-up stagger-2 relative">
        <Suspense fallback={<StepFallback />}>
          {currentStep === 1 && <Step1Form />}
          {currentStep === 2 && <Step2Form />}
          {currentStep === 3 && <Step3Review onComplete={onBack} />}
        </Suspense>
      </div>
    </div>
  )
}

export function CreateQuest({ onBack }: CreateQuestProps) {
  const { connected, connect, loading } = useWallet()

  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-md px-4">
          <div className="bg-background border-border animate-scale-in overflow-hidden border shadow-xl">
            <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
              <span className="text-xs font-semibold tracking-wider uppercase">Create Quest</span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>
            <div className="p-8 text-center">
              <div className="bg-accent border-border mx-auto mb-5 flex h-16 w-16 items-center justify-center border shadow-md">
                <Wallet className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold">Connect your wallet</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                You need a connected Freighter wallet to create a quest and sign on-chain
                transactions.
              </p>
              <Button
                size="lg"
                onClick={connect}
                disabled={loading}
                className="shimmer-on-hover w-full"
              >
                <Wallet className="h-4 w-4" />
                {loading ? "Connecting..." : "Connect Wallet"}
              </Button>
              <button
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground mx-auto mt-4 flex cursor-pointer items-center gap-1 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <QuestCreationProvider>
      <CreateQuestContent onBack={onBack} />
    </QuestCreationProvider>
  )
}
