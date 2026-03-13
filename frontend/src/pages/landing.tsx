import { ArrowRight, Zap, Users, Trophy, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LandingProps {
  onNavigate: (page: string) => void
}

export function Landing({ onNavigate }: LandingProps) {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_50%)] opacity-10" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8">
            <Zap className="h-3.5 w-3.5" />
            Built on Stellar
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Incentivize learning.
            <br />
            <span className="text-primary">Reward progress.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
            Create a workspace, set milestones, enroll learners. When they hit
            their goals, they earn tokens on Stellar. Commitment through
            incentive.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="text-base px-8"
              onClick={() => onNavigate("dashboard")}
            >
              Create a Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8"
              onClick={() => onNavigate("dashboard")}
            >
              Browse Workspaces
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-card/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <h2 className="text-center text-2xl font-bold mb-4">
            How it works
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Three steps. No complexity. Just create, assign, and reward.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create a workspace",
                desc: "Set up a learning space. Choose a reward token and fund the pool.",
              },
              {
                step: "02",
                title: "Set milestones",
                desc: 'Define goals like "Build your first API" or "Deploy a contract." Assign token rewards.',
              },
              {
                step: "03",
                title: "Verify & reward",
                desc: "When a learner completes a milestone, verify it. Tokens transfer automatically.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center sm:text-left">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: "For anyone",
                desc: "Teach a friend, mentor a team, run a bootcamp.",
              },
              {
                icon: Zap,
                title: "Instant rewards",
                desc: "Tokens transfer on-chain the moment you verify.",
              },
              {
                icon: Shield,
                title: "Transparent",
                desc: "Everything on Stellar. Verifiable and auditable.",
              },
              {
                icon: Trophy,
                title: "Real incentive",
                desc: "Financial commitment drives real completion.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors"
              >
                <feature.icon className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-card/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to start?</h2>
          <p className="text-muted-foreground mb-8">
            Connect your Freighter wallet and create your first workspace.
          </p>
          <Button
            size="lg"
            className="text-base px-8"
            onClick={() => onNavigate("dashboard")}
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Lernza
          </div>
          <p className="text-xs text-muted-foreground">
            Built on Stellar. Open source.
          </p>
        </div>
      </footer>
    </div>
  )
}
