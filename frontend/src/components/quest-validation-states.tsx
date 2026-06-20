import { AlertCircle, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { QuestValidationState } from "@/lib/quest-validation"
import { navigateToPath } from "@/lib/navigation"

interface QuestValidationErrorProps {
  state: QuestValidationState
}

export function QuestValidationError({ state }: QuestValidationErrorProps) {
  if (state.status === "valid") {
    return null
  }

  const getErrorContent = () => {
    switch (state.status) {
      case "invalid":
        if (state.reason === "not_a_number") {
          return {
            title: "Invalid Quest ID",
            description: "The quest ID must be a valid number.",
          }
        }
        if (state.reason === "negative") {
          return {
            title: "Invalid Quest ID",
            description: "The quest ID cannot be negative.",
          }
        }
        return {
          title: "Invalid Quest ID",
          description: "The quest ID format is invalid.",
        }

      case "missing":
        return {
          title: "Quest ID Missing",
          description: "No quest ID was provided in the URL.",
        }

      case "inaccessible":
        return {
          title: "Quest Unavailable",
          description: state.reason || "This quest is not available.",
        }

      default:
        return {
          title: "Unknown Error",
          description: "An unexpected error occurred.",
        }
    }
  }

  const { title, description } = getErrorContent()

  return (
    <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
      <div className="bg-grid-dots pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-lg px-4">
        <div className="bg-card text-card-foreground border-border animate-scale-in overflow-hidden border shadow-xl">
          <div className="bg-destructive border-border flex items-center justify-between border-b px-6 py-3">
            <span className="text-xs font-semibold tracking-wider uppercase">Error</span>
            <div className="flex items-center gap-1.5">
              <div className="bg-destructive h-2.5 w-2.5" />
              <span className="text-xs font-bold">Invalid Quest</span>
            </div>
          </div>

          <div className="p-8 text-center sm:p-10">
            <div className="bg-destructive border-border animate-fade-in-up mx-auto mb-6 flex h-20 w-20 items-center justify-center border shadow-md">
              {state.status === "inaccessible" ? (
                <HelpCircle className="h-8 w-8" />
              ) : (
                <AlertCircle className="h-8 w-8" />
              )}
            </div>
            <h2 className="animate-fade-in-up stagger-1 mb-3 text-2xl font-semibold sm:text-3xl">
              {title}
            </h2>
            <p className="text-muted-foreground animate-fade-in-up stagger-2 mx-auto mb-8 max-w-sm">
              {description}
            </p>
            <Button
              size="lg"
              onClick={() => navigateToPath("/dashboard")}
              className="animate-fade-in-up stagger-3"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
