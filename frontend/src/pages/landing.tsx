import { ArrowRight, Users, Zap, Trophy, Shield, Target, Coins, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LandingProps {
  onNavigate: (page: string) => void
}

export function Landing({ onNavigate }: LandingProps) {
  return (
    <div className="flex flex-col">
      {/* ══ Hero ══ */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        {/* Background geometric accents */}
        <div className="absolute top-16 right-[10%] w-28 h-28 bg-primary border-[3px] border-black shadow-[6px_6px_0_#000] rotate-12 opacity-20 hidden lg:block" />
        <div className="absolute bottom-20 left-[5%] w-20 h-20 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-6 opacity-15 hidden lg:block" />
        <div className="absolute top-1/2 right-[3%] w-12 h-12 bg-black opacity-10 rotate-45 hidden lg:block" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2 mb-8 animate-fade-in-up text-sm font-bold">
                Built on Stellar
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight mb-8">
                <span className="block animate-fade-in-up">Learn.</span>
                <span className="block animate-fade-in-up stagger-1">
                  <span className="inline-block bg-primary px-3 py-1 border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-1">
                    Earn.
                  </span>
                </span>
                <span className="block animate-fade-in-up stagger-2">On-chain.</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-10 max-w-md animate-fade-in-up stagger-3 leading-relaxed">
                Create quests, set milestones, and reward learners with tokens.
                The first learn-to-earn platform on Stellar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-4">
                <Button size="lg" onClick={() => onNavigate("dashboard")}>
                  Launch App
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="lg" onClick={() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                }}>
                  How it works
                </Button>
              </div>
            </div>

            {/* Right: Mock quest card */}
            <div className="hidden lg:block animate-scale-in stagger-3">
              <div className="relative">
                {/* Back card (peeking) */}
                <div className="absolute -top-3 -left-3 w-full h-full bg-primary border-[3px] border-black" />

                {/* Main card */}
                <div className="relative bg-white border-[3px] border-black shadow-[8px_8px_0_#000] p-6">
                  {/* Card header */}
                  <div className="bg-primary border-[2px] border-black px-3 py-1.5 mb-5 inline-block">
                    <span className="text-xs font-black uppercase tracking-wider">Active Quest</span>
                  </div>

                  <h3 className="text-xl font-black mb-1">Stellar Dev Bootcamp</h3>
                  <p className="text-sm text-muted-foreground mb-5">8 enrolled &middot; 1,000 XLM pool</p>

                  {/* Milestones preview */}
                  <div className="space-y-3 mb-5">
                    {[
                      { done: true, label: "Set up Stellar CLI", reward: 100 },
                      { done: true, label: "First Soroban Contract", reward: 200 },
                      { done: false, label: "Deploy to Testnet", reward: 300 },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-[2px] border-black flex items-center justify-center flex-shrink-0 ${m.done ? "bg-success" : "bg-white"}`}>
                          {m.done && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <span className={`flex-1 text-sm font-bold ${m.done ? "line-through text-muted-foreground" : ""}`}>
                          {m.label}
                        </span>
                        <span className="text-xs font-bold bg-secondary border border-black px-2 py-0.5">
                          {m.reward} XLM
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="h-4 w-full border-[2px] border-black bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: "66%" }} />
                  </div>
                  <p className="text-xs font-bold mt-2 text-muted-foreground">2 of 3 milestones completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ How it works ══ */}
      <section id="how-it-works" className="border-t-[3px] border-black bg-secondary py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-block bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2 mb-5">
              <span className="font-black text-sm uppercase tracking-wider">How it works</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              Three steps. Zero complexity.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
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
                desc: "When a learner completes a milestone, verify it on-chain. Tokens transfer automatically.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`bg-white border-[3px] border-black shadow-[6px_6px_0_#000] p-6 neo-lift hover:shadow-[8px_8px_0_#000] active:shadow-[3px_3px_0_#000] animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center font-black text-lg">
                    {item.step}
                  </div>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Features ══ */}
      <section className="border-t-[3px] border-black py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Why Lernza?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Real incentives drive real learning. Everything on-chain, everything verifiable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: "For anyone",
                desc: "Teach a friend, mentor a team, run a bootcamp. Anyone can create a quest.",
                color: "bg-blue-200",
              },
              {
                icon: Zap,
                title: "Instant rewards",
                desc: "Tokens transfer on-chain the moment you verify. No delays, no middleman.",
                color: "bg-primary",
              },
              {
                icon: Shield,
                title: "Transparent",
                desc: "Everything on Stellar. Every milestone, every reward — verifiable and auditable.",
                color: "bg-green-200",
              },
              {
                icon: Trophy,
                title: "Real incentive",
                desc: "Financial commitment drives real completion. Skin in the game works.",
                color: "bg-pink-200",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`border-[3px] border-black shadow-[5px_5px_0_#000] p-6 neo-lift hover:shadow-[7px_7px_0_#000] active:shadow-[2px_2px_0_#000] bg-white animate-fade-in-up stagger-${i + 1}`}
              >
                <div className={`w-12 h-12 ${feature.color} border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center mb-4`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-black mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="border-t-[3px] border-black bg-primary py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Ready to start earning?
          </h2>
          <p className="text-lg mb-10 max-w-md mx-auto opacity-80">
            Connect your Freighter wallet and create your first quest. It takes two minutes.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="text-base"
            onClick={() => onNavigate("dashboard")}
          >
            Launch App
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ══ Footer ══ */}
      <footer className="border-t-[3px] border-black py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary border-[2px] border-black" />
            <span className="font-black">Lernza</span>
          </div>
          <p className="text-sm text-muted-foreground font-bold">
            Built on Stellar. Open source.
          </p>
        </div>
      </footer>
    </div>
  )
}
