import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CtaSectionProps {
  ctaRef: React.RefObject<HTMLDivElement | null>
  ctaInView: boolean
  onNavigate: (page: string) => void
}

/** Closing call to action, on the accent background. */
export function CtaSection({ ctaRef, ctaInView, onNavigate }: CtaSectionProps) {
  return (
      <section
        ref={ctaRef}
        className="border-border bg-accent relative overflow-hidden border-t py-24 sm:py-32"
      >
        <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-50" />

        <div
          className={`reveal-scale relative mx-auto max-w-7xl px-4 text-center sm:px-6 ${ctaInView ? "in-view" : ""}`}
        >
          <h2 className="font-display mb-5 text-4xl sm:text-5xl lg:text-6xl">
            Ready to start earning?
          </h2>
          <p className="mx-auto mb-12 max-w-md text-lg opacity-80">
            Connect your Freighter wallet and create your first quest. It takes two minutes.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="shimmer-on-hover group text-base"
            onClick={() => onNavigate("dashboard")}
          >
            Launch App
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </section>
  )
}
