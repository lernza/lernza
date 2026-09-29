import { ArrowRight, ChevronDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedQuestCard } from "./animated-quest-card"
import type { PlatformStats } from "./use-platform-stats"

export interface HeroSectionProps {
  onNavigate: (page: string) => void
  platformStats: PlatformStats
}

/** Above-the-fold hero: headline, calls to action, and live platform counters. */
export function HeroSection({ onNavigate, platformStats }: HeroSectionProps) {
  return (
      <section className="relative flex min-h-[calc(100vh-67px)] items-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-60" />

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="py-20 lg:py-0">
              <div className="bg-accent/10 text-accent border-accent/20 animate-fade-in-up mb-10 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Built on Stellar
              </div>

              <h1 className="font-display mb-10 text-4xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.25rem] xl:text-[6rem]">
                <span className="animate-fade-in-up block">Learn.</span>
                <span className="animate-fade-in-up stagger-2 text-accent block italic">Earn.</span>
                <span className="animate-fade-in-up stagger-3 block">On-chain.</span>
              </h1>

              <p className="text-muted-foreground animate-fade-in stagger-4 mb-12 max-w-lg text-xl leading-relaxed">
                Create quests, set milestones, and reward learners with tokens — the first
                learn-to-earn platform on Stellar.
              </p>

              <div className="animate-fade-in-up stagger-5 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="shimmer-on-hover group text-base"
                  onClick={() => onNavigate("dashboard")}
                >
                  Launch App
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="text-base"
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  See how it works
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="animate-fade-in-up stagger-6 mt-12 grid grid-cols-3 gap-4 border-t border-border/60 pt-6">
                <div>
                  <div className="font-display text-2xl font-bold tracking-tight text-foreground">{platformStats.totalQuests}+</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Quests</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold tracking-tight text-foreground">{platformStats.activeLearners}+</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Learners</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold tracking-tight text-accent">{platformStats.totalDistributed}</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distributed</div>
                </div>
              </div>

              <div className="animate-fade-in-up stagger-6 mt-6 flex flex-wrap gap-6">
                {[
                  { color: "bg-accent", text: "3 smart contracts" },
                  { color: "bg-success", text: "On-chain rewards" },
                  { color: "bg-foreground", text: "Open source" },
                ].map(item => (
                  <div key={item.text} className="group flex cursor-default items-center gap-2">
                    <div
                      className={`h-3 w-3 ${item.color} border-border border transition-transform group-hover:scale-125`}
                    />
                    <span className="text-muted-foreground group-hover:text-foreground text-sm font-bold transition-colors">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-scale-in stagger-3 hidden lg:block">
              <AnimatedQuestCard />
            </div>
          </div>
        </div>
      </section>
  )
}
