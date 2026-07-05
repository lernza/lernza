 
import { ArrowLeft, Plus, UserPlus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { ShareButton } from "@/components/share-button"
import { ToastContextType } from "@/hooks/use-toast"

interface QuestHeaderProps {
  questId: number
  questName: string
  questDescription: string
  isComplete: boolean
  onBack: () => void
  onAddEnrollee: () => void
  onAddMilestone: () => void
  onToast: ToastContextType["addToast"]
}

export function QuestHeader({
  questId,
  questName,
  questDescription,
  isComplete,
  onBack,
  onAddEnrollee,
  onAddMilestone,
  onToast,
}: QuestHeaderProps) {
  return (
    <>
      <Breadcrumb items={[{ label: "Quests", onClick: onBack }, { label: questName }]} />

      {/* Back button */}
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
      >
        <div className="border-border bg-background neo-press group-hover:bg-accent flex h-7 w-7 items-center justify-center border shadow-sm transition-colors hover:shadow-md active:shadow-sm">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        Back to Dashboard
      </button>

      {/* Quest header card */}
      <div className="bg-background border-border animate-fade-in-up relative mb-8 overflow-hidden border shadow-lg">
        {/* Header bar */}
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wider uppercase">Quest Details</span>
            {isComplete && (
              <Badge variant="success" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-success border-border h-2.5 w-2.5 border" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="relative p-6">
          <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">{questName}</h1>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">{questDescription}</p>
            </div>
            <div className="flex flex-shrink-0 gap-3">
              <Button variant="outline" size="sm" className="shimmer-on-hover" onClick={onAddEnrollee}>
                <UserPlus className="h-4 w-4" />
                Add Enrollee
              </Button>
              <Button size="sm" className="shimmer-on-hover" onClick={onAddMilestone}>
                <Plus className="h-4 w-4" />
                Add Milestone
              </Button>
              <ShareButton questId={questId} questName={questName} onToast={onToast} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
