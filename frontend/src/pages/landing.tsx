import { ArrowRight, Users, Zap, Trophy, Shield, Target, Coins, CheckCircle2, ChevronDown, Github } from "lucide-react"
import { Button } from "@/components/ui/button"

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

interface LandingProps {
  onNavigate: (page: string) => void
}

export function Landing({ onNavigate }: LandingProps) {
  return (
    <div className="flex flex-col">
      {/* ══════════════════════════════════════════════ */}
      {/* HERO — Full viewport height                   */}
      {/* ══════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-67px)] flex items-center overflow-hidden">
        {/* Floating geometric background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[6%] left-[3%] w-20 h-20 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] rotate-12 opacity-[0.07] animate-float"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute top-[14%] right-[6%] w-14 h-14 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-6 opacity-[0.09] animate-float"
            style={{ animationDuration: "6s", animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-[22%] left-[7%] w-10 h-10 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-45 opacity-[0.06] animate-float"
            style={{ animationDuration: "7s", animationDelay: "2s" }}
          />
          <div
            className="absolute top-[42%] right-[3%] w-8 h-8 bg-black opacity-[0.04] rotate-12 animate-float"
            style={{ animationDuration: "9s", animationDelay: "0.5s" }}
          />
          <div
            className="absolute bottom-[16%] right-[10%] w-16 h-16 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-12 opacity-[0.08] animate-float"
            style={{ animationDuration: "7s", animationDelay: "3s" }}
          />
          <div
            className="absolute top-[55%] left-[14%] w-6 h-6 bg-primary border-[2px] border-black opacity-[0.1] rotate-6 animate-float"
            style={{ animationDuration: "5s", animationDelay: "1.5s" }}
          />
          <div
            className="absolute top-[4%] left-[42%] w-12 h-12 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000] rotate-45 opacity-[0.05] animate-float"
            style={{ animationDuration: "10s", animationDelay: "2s" }}
          />
          <div
            className="absolute bottom-[32%] left-[48%] w-7 h-7 bg-black opacity-[0.03] -rotate-12 animate-float"
            style={{ animationDuration: "8s", animationDelay: "4s" }}
          />
          <div
            className="absolute top-[75%] right-[25%] w-5 h-5 bg-primary border border-black opacity-[0.08] rotate-12 animate-float"
            style={{ animationDuration: "6s", animationDelay: "3.5s" }}
          />
          <div
            className="absolute top-[25%] left-[30%] w-4 h-4 bg-black opacity-[0.04] -rotate-45 animate-float"
            style={{ animationDuration: "11s", animationDelay: "1s" }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* ── Left: Copy ── */}
            <div className="py-20 lg:py-0">
              <div className="inline-flex items-center gap-2 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2 mb-10 animate-fade-in-up text-sm font-bold">
                Built on Stellar
              </div>

              <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-black leading-[0.88] tracking-tight mb-10">
                <span className="block animate-fade-in-up">Learn.</span>
                <span className="block animate-fade-in-up stagger-1">
                  <span className="inline-block bg-primary px-4 py-2 border-[3px] border-black shadow-[6px_6px_0_#000] -rotate-2 my-2">
                    Earn.
                  </span>
                </span>
                <span className="block animate-fade-in-up stagger-2">On-chain.</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-12 max-w-lg animate-fade-in-up stagger-3 leading-relaxed">
                Create quests, set milestones, and reward learners with tokens.
                The first learn-to-earn platform on Stellar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-4">
                <Button size="lg" className="text-base" onClick={() => onNavigate("dashboard")}>
                  Launch App
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="text-base"
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  How it works
                </Button>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap gap-6 mt-14 animate-fade-in-up stagger-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success border border-black" />
                  <span className="text-sm font-bold text-muted-foreground">33 tests passing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary border border-black" />
                  <span className="text-sm font-bold text-muted-foreground">3 smart contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-200 border border-black" />
                  <span className="text-sm font-bold text-muted-foreground">Open source</span>
                </div>
              </div>
            </div>

            {/* ── Right: Hero illustration ── */}
            <div className="hidden lg:block animate-scale-in stagger-3">
              <div className="relative">
                {/* Stacked back cards */}
                <div className="absolute -top-4 -left-4 w-full h-full bg-primary/30 border-[3px] border-black" />
                <div className="absolute -top-2 -left-2 w-full h-full bg-primary/60 border-[3px] border-black" />

                {/* Main quest card */}
                <div className="relative bg-white border-[3px] border-black shadow-[8px_8px_0_#000] overflow-hidden">
                  {/* Card header */}
                  <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">Active Quest</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-success border border-black" />
                      <span className="text-xs font-bold">Live</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-black mb-1">Stellar Dev Bootcamp</h3>
                    <p className="text-sm text-muted-foreground mb-6">8 enrolled &middot; 1,000 LEARN pool</p>

                    {/* Milestones */}
                    <div className="space-y-4 mb-6">
                      {[
                        { done: true, label: "Set up Stellar CLI", reward: 100 },
                        { done: true, label: "First Soroban Contract", reward: 200 },
                        { done: false, label: "Deploy to Testnet", reward: 300 },
                      ].map((m) => (
                        <div key={m.label} className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 border-[2px] border-black flex items-center justify-center flex-shrink-0 ${
                              m.done ? "bg-success" : "bg-white"
                            }`}
                          >
                            {m.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                          <span
                            className={`flex-1 text-sm font-bold ${
                              m.done ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {m.label}
                          </span>
                          <span className="text-xs font-bold bg-secondary border-[1.5px] border-black px-2 py-0.5 shadow-[2px_2px_0_#000]">
                            {m.reward} LEARN
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="h-5 w-full border-[3px] border-black bg-secondary shadow-[2px_2px_0_#000]">
                      <div className="h-full bg-primary transition-all" style={{ width: "66%" }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs font-bold text-muted-foreground">2 of 3 milestones</p>
                      <p className="text-xs font-bold text-muted-foreground">66%</p>
                    </div>

                    {/* Earned bar */}
                    <div className="mt-4 bg-green-50 border-[2px] border-black px-4 py-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Total earned</span>
                      <span className="text-sm font-black text-green-700">+300 LEARN</span>
                    </div>
                  </div>
                </div>

                {/* Floating earned badge */}
                <div className="absolute -bottom-5 -right-4 bg-success border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2.5 animate-fade-in-up stagger-6">
                  <span className="font-black text-sm">+200 LEARN earned</span>
                </div>

                {/* Floating accent blocks */}
                <div className="absolute -top-8 -right-6 w-10 h-10 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-12 animate-fade-in-up stagger-7" />
                <div className="absolute -bottom-7 -left-5 w-8 h-8 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000] -rotate-6 animate-fade-in-up stagger-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in stagger-6">
          <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Scroll</span>
          <div className="w-8 h-8 border-[2px] border-black bg-white shadow-[2px_2px_0_#000] flex items-center justify-center animate-bounce">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                  */}
      {/* ══════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-t-[3px] border-black bg-secondary py-24 sm:py-32 relative overflow-hidden">
        {/* Subtle background accents */}
        <div className="absolute top-12 right-[5%] w-24 h-24 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] rotate-12 opacity-[0.06]" />
        <div className="absolute bottom-16 left-[3%] w-16 h-16 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-6 opacity-[0.05]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-block bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2 mb-6">
              <span className="font-black text-sm uppercase tracking-wider">How it works</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black">
              Three steps. Zero complexity.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
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
              <div
                key={item.step}
                className={`relative bg-white border-[3px] border-black shadow-[6px_6px_0_#000] p-8 neo-lift hover:shadow-[8px_8px_0_#000] active:shadow-[3px_3px_0_#000] animate-fade-in-up stagger-${i + 1}`}
              >
                {/* Large watermark number */}
                <div className="absolute top-3 right-4 text-[80px] font-black text-primary/15 leading-none select-none pointer-events-none">
                  {item.step}
                </div>
                <div className="relative">
                  <div className="w-14 h-14 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center mb-6">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* FEATURES — 2×2 grid                          */}
      {/* ══════════════════════════════════════════════ */}
      <section className="border-t-[3px] border-black py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute bottom-10 right-[4%] w-12 h-12 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-45 opacity-[0.06]" />
        <div className="absolute top-16 left-[6%] w-8 h-8 bg-black opacity-[0.04] -rotate-12" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-5">
              Why Lernza?
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Real incentives drive real learning. Everything on-chain, everything verifiable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {[
              {
                icon: Users,
                title: "For anyone",
                desc: "Teach a friend, mentor a team, run a bootcamp. Anyone can create a quest. No gatekeeping, no approval needed.",
                color: "bg-blue-200",
              },
              {
                icon: Zap,
                title: "Instant rewards",
                desc: "Tokens transfer on-chain the moment you verify. No delays, no middleman, no withdrawal queues.",
                color: "bg-primary",
              },
              {
                icon: Shield,
                title: "Fully transparent",
                desc: "Everything on Stellar. Every milestone, every reward — verifiable and auditable by anyone.",
                color: "bg-green-200",
              },
              {
                icon: Trophy,
                title: "Real incentive",
                desc: "Financial commitment drives real completion. Skin in the game works — learners finish what they start.",
                color: "bg-pink-200",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`border-[3px] border-black shadow-[6px_6px_0_#000] p-8 neo-lift hover:shadow-[8px_8px_0_#000] active:shadow-[3px_3px_0_#000] bg-white animate-fade-in-up stagger-${i + 1}`}
              >
                <div className={`w-14 h-14 ${feature.color} border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center mb-6`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* CTA                                           */}
      {/* ══════════════════════════════════════════════ */}
      <section className="border-t-[3px] border-black bg-primary py-24 sm:py-32 relative overflow-hidden">
        {/* Geometric accents */}
        <div className="absolute top-10 left-[5%] w-20 h-20 bg-black/5 border-[3px] border-black/10 rotate-12" />
        <div className="absolute bottom-10 right-[8%] w-16 h-16 bg-black/5 border-[2px] border-black/10 -rotate-6" />
        <div className="absolute top-1/2 left-[80%] w-10 h-10 bg-black/5 border-[2px] border-black/10 rotate-45" />
        <div className="absolute bottom-[20%] left-[15%] w-6 h-6 bg-black/5 border-[2px] border-black/10 -rotate-12" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center relative">
          <h2 className="text-4xl sm:text-5xl font-black mb-5">
            Ready to start earning?
          </h2>
          <p className="text-lg mb-12 max-w-md mx-auto opacity-80">
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

      {/* ══════════════════════════════════════════════ */}
      {/* FOOTER                                        */}
      {/* ══════════════════════════════════════════════ */}
      <footer className="border-t-[3px] border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Main footer */}
          <div className="py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000]" />
                <span className="font-black text-xl">Lernza</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The first learn-to-earn platform on Stellar. Create quests, set milestones, reward learners with tokens.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider mb-4">Resources</h3>
              <div className="flex flex-col gap-3">
                <a href="https://github.com/lernza/lernza" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
                <a href="https://github.com/lernza/lernza/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Contributing</a>
                <a href="https://github.com/lernza/lernza/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">MIT License</a>
              </div>
            </div>

            {/* Socials */}
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider mb-4">Community</h3>
              <div className="flex gap-3">
                <a
                  href="https://github.com/lernza"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center neo-press hover:shadow-[4px_4px_0_#000] active:shadow-[1px_1px_0_#000] hover:bg-primary transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com/lernza"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center neo-press hover:shadow-[4px_4px_0_#000] active:shadow-[1px_1px_0_#000] hover:bg-primary transition-colors"
                  aria-label="X (Twitter)"
                >
                  <XIcon className="h-4 w-4" />
                </a>
                <a
                  href="https://discord.gg/lernza"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center neo-press hover:shadow-[4px_4px_0_#000] active:shadow-[1px_1px_0_#000] hover:bg-primary transition-colors"
                  aria-label="Discord"
                >
                  <DiscordIcon className="h-4 w-4" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Join the community and help build the future of learn-to-earn.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t-[2px] border-black py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs font-bold text-muted-foreground">
              Built on Stellar &middot; Open source &middot; MIT License
            </p>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Lernza
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
