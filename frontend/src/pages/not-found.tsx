import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NotFoundProps {
  onNavigate: (page: string) => void
}

export function NotFound({ onNavigate }: NotFoundProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
      <div className="flex flex-col items-center justify-center text-center py-16 animate-fade-in-up">
        <div className="text-[120px] sm:text-[160px] font-black leading-none text-primary select-none mb-2">
          404
        </div>
        <h2 className="text-2xl font-black mb-3">Page not found</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => onNavigate("landing")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </div>
    </div>
  )
}
