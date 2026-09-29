import { Coins, Target, Trophy } from "lucide-react"
import { handleQuestCardGridKeyDown } from "@/lib/quest-card-keyboard"

export interface HowItWorksProps {
  howRef: React.RefObject<HTMLDivElement | null>
  howInView: boolean
}

/** Numbered walkthrough of the create -> milestones -> reward flow. */
export function HowItWorks({ howRef, howInView }: HowItWorksProps) {
  return (
      <section
        id="how-it-works"
        ref={howRef}
        className="bg-secondary relative overflow-hidden py-24 sm:py-32"
      >
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className={`reveal-up mb-16 text-center ${howInView ? "in-view" : ""}`}>
            <div className="bg-accent border-border mb-6 inline-block border-2 px-4 py-2 shadow-md">
              <span className="text-sm font-semibold tracking-wider uppercase">How it works</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl">Three steps. Zero complexity.</h2>
          </div>

          <div
            className="grid grid-cols-1 items-stretch gap-0 sm:grid-cols-3"
            role="list"
            aria-label="How it works. Use arrow keys to move between steps."
            data-quest-card-group
            onKeyDown={handleQuestCardGridKeyDown}
          >
            {[
              {
                step: "01",
                icon: Target,
                title: "Create a Quest",
                desc: "Set up a learning path. Choose a reward token and fund the pool with your incentive budget.",
              },
              {
                step: "02",
                icon: Coins,
                title: "Set Milestones",
                desc: "Define verifiable goals like 'Build your first API' or 'Deploy a contract.' Assign token rewards to each.",
              },
              {
                step: "03",
                icon: Trophy,
                title: "Verify & Reward",
                desc: "When a learner completes a milestone, verify it on-chain. Tokens transfer automatically. No middleman.",
              },
            ].map((item, i) => (
              <div key={item.step} className="flex items-stretch" role="listitem">
                <div
                  tabIndex={0}
                  data-quest-card
                  aria-label={`Step ${item.step}: ${item.title}`}
                  className={`bg-card text-card-foreground border-border card-tilt reveal-up focus-visible:ring-ring relative flex-1 border p-8 shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${howInView ? "in-view" : ""} shimmer-on-hover group`}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <div className="text-accent/15 group-hover:text-accent/25 pointer-events-none absolute top-3 right-4 text-[80px] leading-none font-semibold transition-colors duration-300 select-none">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="bg-accent border-border mb-6 flex h-14 w-14 items-center justify-center border-2 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>

                {i < 2 && (
                  <div className="z-10 -mx-1 hidden w-8 items-center justify-center sm:flex">
                    <div
                      className={`step-line w-full ${howInView ? "in-view" : ""}`}
                      style={{ transitionDelay: `${(i + 1) * 300}ms` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
  )
}
