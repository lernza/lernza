import { useInView } from "@/hooks/use-animations"
import { PageMetadata } from "@/components/PageMetadata"
import { PAGE_METADATA } from "@/lib/page-metadata"
import { HeroSection } from "./landing/hero-section"
import { HowItWorks } from "./landing/how-it-works"
import { FeaturesGrid } from "./landing/features-grid"
import { CtaSection } from "./landing/cta-section"
import { LandingFooter } from "./landing/footer"
import { usePlatformStats } from "./landing/use-platform-stats"

interface LandingProps {
  onNavigate: (page: string) => void
}

/**
 * Landing page. Owns only the scroll-reveal observers and platform totals; each
 * marketing section lives in its own component under `./landing/`.
 */
export function Landing({ onNavigate }: LandingProps) {
  return (
    <>
      <PageMetadata {...PAGE_METADATA.landing} />
      <LandingContent onNavigate={onNavigate} />
    </>
  )
}

function LandingContent({ onNavigate }: LandingProps) {
  const [howRef, howInView] = useInView()
  const [featRef, featInView] = useInView()
  const [ctaRef, ctaInView] = useInView()
  const platformStats = usePlatformStats()

  return (
    <div className="flex flex-col">
      <HeroSection onNavigate={onNavigate} platformStats={platformStats} />

      <HowItWorks howRef={howRef} howInView={howInView} />

      <FeaturesGrid featRef={featRef} featInView={featInView} />

      <CtaSection ctaRef={ctaRef} ctaInView={ctaInView} onNavigate={onNavigate} />

      <LandingFooter onNavigate={onNavigate} />
    </div>
  )
}
