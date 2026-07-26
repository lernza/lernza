import { ArrowLeft, Plus, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface QuestHeaderPanelProps {
  questId: number
  questName: string
  questDescription: string
  isComplete: boolean
  onBack: () => void
  onAddEnrollee: () => void
  onAddMilestone: () => void
  onToast: (msg: { message: string; type: string }) => void
}

export function QuestHeaderPanel({
  questId,
  questName,
  questDescription,
  isComplete,
  onBack,
  onAddEnrollee,
  onAddMilestone,
  onToast,
}: QuestHeaderPanelProps) {
  const handleShare = () => {
    const url = `${window.location.origin}?questId=${questId}`
    navigator.clipboard.writeText(url)
    onToast({ message: "Quest link copied to clipboard", type: "success" })
  }

  return (
    <div className="mb-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {isComplete && (
              <Badge variant="success">Completed</Badge>
            )}
          </div>

          <h1 className="text-4xl font-bold leading-tight">{questName}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base">{questDescription}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={onAddMilestone} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
          <Button size="sm" onClick={onAddEnrollee} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Enrollee
          </Button>
        </div>
      </div>
    </div>
  )
}
