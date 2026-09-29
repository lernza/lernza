import { Shield, Trophy, Users, Zap } from "lucide-react"
import { handleQuestCardGridKeyDown } from "@/lib/quest-card-keyboard"

export interface FeaturesGridProps {
  featRef: React.RefObject<HTMLDivElement | null>
  featInView: boolean
}

/** "Why Lernza?" benefit grid. */
export function FeaturesGrid({ featRef, featInView }: FeaturesGridProps) {
  return (
      <section
        ref={featRef}
        className="border-border relative overflow-hidden border-t py-24 sm:py-32"
      >
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className={`reveal-up mb-16 text-center ${featInView ? "in-view" : ""}`}>
            <h2 className="font-display mb-5 text-4xl sm:text-5xl">Why Lernza?</h2>
            <p className="text-muted-foreground mx-auto max-w-lg text-lg">
              Real incentives drive real learning. Everything on-chain, everything verifiable.
            </p>
          </div>

          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2"
            role="list"
            aria-label="Why Lernza. Use arrow keys to move between features."
            data-quest-card-group
            onKeyDown={handleQuestCardGridKeyDown}
          >
            {[
              {
                icon: Users,
                title: "For anyone",
                desc: "Teach a friend, mentor a team, run a bootcamp. Anyone can create a quest. No gatekeeping, no approval needed.",
                accent: "bg-accent",
                large: true,
              },
              {
                icon: Zap,
                title: "Instant rewards",
                desc: "Tokens transfer on-chain the moment you verify. No delays, no middleman, no withdrawal queues.",
                accent: "bg-accent",
                large: true,
              },
              {
                icon: Shield,
                title: "Fully transparent",
                desc: "Everything on Stellar's ledger. Every milestone, every reward — verifiable and auditable by anyone.",
                accent: "bg-success",
                large: false,
              },
              {
                icon: Trophy,
                title: "Real incentive",
                desc: "Financial commitment drives real completion. Skin in the game works — learners finish what they start.",
                accent: "bg-accent",
                large: false,
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                role="listitem"
                tabIndex={0}
                data-quest-card
                aria-label={feature.title}
                className={`border-border bg-card text-card-foreground card-tilt shimmer-on-hover group reveal-up focus-visible:ring-ring border shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${featInView ? "in-view" : ""} ${feature.large ? "p-10" : "p-8"}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div
                  className={`h-14 w-14 ${feature.accent} border-border mb-6 flex items-center justify-center border-2 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className={`mb-3 font-semibold ${feature.large ? "text-2xl" : "text-lg"}`}>
                  {feature.title}
                </h3>
                <p
                  className={`text-muted-foreground leading-relaxed ${feature.large ? "text-base" : ""}`}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
  )
}
