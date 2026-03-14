import { useState, useEffect } from "react"
import {
  ArrowRight,
  Users,
  Zap,
  Trophy,
  Shield,
  Target,
  Coins,
  CheckCircle2,
  ChevronDown,
  Github,
  Star,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInView, useTypewriter } from "@/hooks/use-animations"

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

/* ─── Animated Quest Card (Hero Illustration) ─── */

function AnimatedQuestCard() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 6)
    }, 2200)
    return () => clearInterval(timer)
  }, [])

  const milestones = [
    { label: "Set up Stellar CLI", reward: 100 },
    { label: "First Soroban Contract", reward: 200 },
    { label: "Deploy to Testnet", reward: 300 },
  ]

  const completedCount = Math.min(step, 3)
  const progress = (completedCount / 3) * 100
  const totalEarned = milestones
    .slice(0, completedCount)
    .reduce((s, m) => s + m.reward, 0)
  const isComplete = completedCount >= 3

  return (
    <div className="relative">
      {/* Stacked back cards */}
      <div className="absolute -top-3 -left-3 w-full h-full bg-primary/20 border-[3px] border-black" />
      <div className="absolute -top-1.5 -left-1.5 w-full h-full bg-primary/40 border-[3px] border-black" />

      {/* Main quest card */}
      <div className="relative bg-white border-[3px] border-black shadow-[8px_8px_0_#000] overflow-hidden">
        {/* Card header */}
        <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider">
            Active Quest
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-success border border-black" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-black mb-1">Stellar Dev Bootcamp</h3>
          <p className="text-sm text-muted-foreground mb-6">
            8 enrolled &middot; 1,000 LEARN pool
          </p>

          {/* Milestones with animated check states */}
          <div className="space-y-4 mb-6">
            {milestones.map((m, i) => {
              const done = i < completedCount
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 border-[2px] border-black flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      done
                        ? "bg-success scale-110"
                        : "bg-white"
                    }`}
                  >
                    {done && (
                      <CheckCircle2 className="h-3.5 w-3.5 animate-scale-in" />
                    )}
                  </div>
                  <span
                    className={`flex-1 text-sm font-bold transition-all duration-500 ${
                      done ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {m.label}
                  </span>
                  <span
                    className={`text-xs font-bold border-[1.5px] border-black px-2 py-0.5 shadow-[2px_2px_0_#000] transition-colors duration-500 ${
                      done ? "bg-success" : "bg-secondary"
                    }`}
                  >
                    {m.reward} LEARN
                  </span>
                </div>
              )
            })}
          </div>

          {/* Animated progress bar */}
          <div className="h-5 w-full border-[3px] border-black bg-secondary shadow-[2px_2px_0_#000]">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isComplete ? "bg-success" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs font-bold text-muted-foreground">
              {completedCount} of 3 milestones
            </p>
            <p className="text-xs font-bold text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>

          {/* Earned bar */}
          <div
            className={`mt-4 border-[2px] border-black px-4 py-2 flex items-center justify-between transition-all duration-500 ${
              isComplete ? "bg-green-100" : "bg-green-50"
            }`}
          >
            <span className="text-xs font-bold text-muted-foreground">
              Total earned
            </span>
            <span className="text-sm font-black text-green-700 transition-all duration-300">
              +{totalEarned} LEARN
            </span>
          </div>

          {/* Quest complete banner */}
          {isComplete && (
            <div className="mt-4 bg-success border-[2px] border-black px-4 py-2.5 text-center animate-bounce-in">
              <span className="font-black text-sm flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                Quest Complete!
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating earned badge */}
      {completedCount > 0 && !isComplete && (
        <div
          key={completedCount}
          className="absolute -bottom-5 -right-4 bg-success border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2.5 animate-bounce-in"
        >
          <span className="font-black text-sm">
            +{milestones[completedCount - 1]?.reward} LEARN
          </span>
        </div>
      )}

      {/* Floating accent blocks */}
      <div className="absolute -top-8 -right-6 w-10 h-10 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-12 animate-float" />
      <div className="absolute -bottom-7 -left-5 w-8 h-8 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000] -rotate-6 animate-float" style={{ animationDelay: "2s" }} />
    </div>
  )
}

/* ─── Marquee Banner ─── */

function MarqueeBanner() {
  const items = [
    "LEARN TO EARN ON STELLAR",
    "ON THE DRIPS WAVE",
    "ON-CHAIN REWARDS, NO MIDDLEMEN",
  ]

  // Repeat items enough times so one half is always wider than the viewport
  const repeated = Array.from({ length: 8 }, () => items).flat()

  return (
    <div className="border-y-[3px] border-black bg-primary overflow-hidden select-none">
      <div className="flex whitespace-nowrap py-3.5 animate-marquee">
        {/* First half */}
        <div className="flex shrink-0">
          {repeated.map((item, i) => (
            <span key={`a-${i}`} className="flex items-center gap-4 mx-5">
              <span className="text-sm font-black uppercase tracking-wider">
                {item}
              </span>
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
          ))}
        </div>
        {/* Duplicate half — seamless loop */}
        <div className="flex shrink-0">
          {repeated.map((item, i) => (
            <span key={`b-${i}`} className="flex items-center gap-4 mx-5">
              <span className="text-sm font-black uppercase tracking-wider">
                {item}
              </span>
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Landing Component ─── */

interface LandingProps {
  onNavigate: (page: string) => void
}

export function Landing({ onNavigate }: LandingProps) {
  const subtitle = useTypewriter(
    "Create quests, set milestones, and reward learners with tokens. The first learn-to-earn platform on Stellar.",
    25
  )

  const [howRef, howInView] = useInView()
  const [featRef, featInView] = useInView()
  const [ctaRef, ctaInView] = useInView()

  return (
    <div className="flex flex-col">
      {/* ══════════════════════════════════════════════ */}
      {/* HERO                                          */}
      {/* ══════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-67px)] flex items-center overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 bg-grid-dots pointer-events-none" />

        {/* Floating geometric shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[6%] left-[3%] w-20 h-20 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] rotate-12 opacity-[0.08] animate-float"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute top-[14%] right-[6%] w-14 h-14 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-6 opacity-[0.1] animate-float"
            style={{ animationDuration: "6s", animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-[22%] left-[7%] w-10 h-10 bg-success border-[2px] border-black shadow-[3px_3px_0_#000] rotate-45 opacity-[0.06] animate-float"
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
            className="absolute top-[75%] right-[25%] w-5 h-5 bg-success border border-black opacity-[0.08] rotate-12 animate-float"
            style={{ animationDuration: "6s", animationDelay: "3.5s" }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* ── Left: Copy ── */}
            <div className="py-20 lg:py-0">
              <div className="inline-flex items-center gap-2 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2 mb-10 animate-fade-in-up text-sm font-bold shimmer-on-hover cursor-default">
                <Sparkles className="h-3.5 w-3.5" />
                Built on Stellar
              </div>

              <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-black leading-[0.88] tracking-tight mb-10">
                <span className="block animate-slide-in-left">Learn.</span>
                <span className="block animate-slide-in-left stagger-2">
                  <span className="inline-block bg-primary px-4 py-2 border-[3px] border-black shadow-[6px_6px_0_#000] -rotate-2 my-2 hover:rotate-0 hover:shadow-[8px_8px_0_#000] transition-all duration-300 cursor-default">
                    Earn.
                  </span>
                </span>
                <span className="block animate-slide-in-left stagger-3">
                  On-chain.
                </span>
              </h1>

              <p className="text-xl text-muted-foreground mb-12 max-w-lg leading-relaxed h-[3.5em] animate-fade-in stagger-4">
                <span>{subtitle}</span>
                <span className="typewriter-cursor" />
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-5">
                <Button
                  size="lg"
                  className="text-base shimmer-on-hover group"
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
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  How it works
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap gap-6 mt-14 animate-fade-in-up stagger-6">
                {[
                  { color: "bg-primary", text: "3 smart contracts" },
                  { color: "bg-success", text: "On-chain rewards" },
                  { color: "bg-foreground", text: "Open source" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 group cursor-default">
                    <div className={`w-3 h-3 ${item.color} border border-black transition-transform group-hover:scale-125`} />
                    <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Animated Hero illustration ── */}
            <div className="hidden lg:block animate-scale-in stagger-3">
              <AnimatedQuestCard />
            </div>
          </div>
        </div>

        {/* Marquee at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0">
          <MarqueeBanner />
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                  */}
      {/* ══════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        ref={howRef}
        className="bg-secondary py-24 sm:py-32 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-diagonal-lines pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
          <div className={`text-center mb-16 reveal-up ${howInView ? "in-view" : ""}`}>
            <div className="inline-block bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-4 py-2 mb-6">
              <span className="font-black text-sm uppercase tracking-wider">
                How it works
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black">
              Three steps. Zero complexity.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 items-stretch">
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
              <div key={item.step} className="flex items-stretch">
                <div
                  className={`relative flex-1 bg-white border-[3px] border-black shadow-[6px_6px_0_#000] p-8 card-tilt reveal-up ${howInView ? "in-view" : ""} shimmer-on-hover group`}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  {/* Large watermark number */}
                  <div className="absolute top-3 right-4 text-[80px] font-black text-primary/15 leading-none select-none pointer-events-none group-hover:text-primary/25 transition-colors duration-300">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="w-14 h-14 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center mb-6 group-hover:shadow-[5px_5px_0_#000] group-hover:-translate-y-1 transition-all duration-300">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-black mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Connector arrow between cards */}
                {i < 2 && (
                  <div className="hidden sm:flex items-center justify-center w-8 -mx-1 z-10">
                    <div
                      className={`w-full step-line ${howInView ? "in-view" : ""}`}
                      style={{ transitionDelay: `${(i + 1) * 300}ms` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* FEATURES                                      */}
      {/* ══════════════════════════════════════════════ */}
      <section
        ref={featRef}
        className="border-t-[3px] border-black py-24 sm:py-32 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid-dots pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
          <div className={`text-center mb-16 reveal-up ${featInView ? "in-view" : ""}`}>
            <h2 className="text-4xl sm:text-5xl font-black mb-5">
              Why Lernza?
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Real incentives drive real learning. Everything on-chain,
              everything verifiable.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Users,
                title: "For anyone",
                desc: "Teach a friend, mentor a team, run a bootcamp. Anyone can create a quest. No gatekeeping, no approval needed.",
                accent: "bg-primary",
                large: true,
              },
              {
                icon: Zap,
                title: "Instant rewards",
                desc: "Tokens transfer on-chain the moment you verify. No delays, no middleman, no withdrawal queues.",
                accent: "bg-primary",
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
                accent: "bg-primary",
                large: false,
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`border-[3px] border-black shadow-[6px_6px_0_#000] bg-white card-tilt shimmer-on-hover group reveal-up ${featInView ? "in-view" : ""} ${feature.large ? "p-10" : "p-8"}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div
                  className={`w-14 h-14 ${feature.accent} border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center mb-6 group-hover:shadow-[5px_5px_0_#000] group-hover:-translate-y-1 transition-all duration-300`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3
                  className={`font-black mb-3 ${feature.large ? "text-2xl" : "text-lg"}`}
                >
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

      {/* ══════════════════════════════════════════════ */}
      {/* CTA                                           */}
      {/* ══════════════════════════════════════════════ */}
      <section
        ref={ctaRef}
        className="border-t-[3px] border-black bg-primary py-24 sm:py-32 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-diagonal-lines pointer-events-none opacity-50" />

        {/* Floating shapes - brutalist variety, bold and visible */}
        <div className="absolute top-8 left-[4%] w-24 h-24 bg-white border-[3px] border-black shadow-[5px_5px_0_rgba(0,0,0,0.4)] rotate-12 opacity-20 animate-float" style={{ animationDuration: "7s" }} />
        <div className="absolute bottom-8 right-[6%] w-20 h-20 bg-black border-[3px] border-white/20 -rotate-6 opacity-20 animate-float" style={{ animationDuration: "9s", animationDelay: "2s" }} />
        <div className="absolute top-[40%] left-[78%] w-14 h-14 bg-success border-[3px] border-black shadow-[4px_4px_0_rgba(0,0,0,0.3)] rotate-45 opacity-[0.18] animate-float" style={{ animationDuration: "6s", animationDelay: "1s" }} />
        <div className="absolute bottom-[25%] left-[12%] w-12 h-12 bg-white border-[3px] border-black shadow-[3px_3px_0_rgba(0,0,0,0.3)] -rotate-12 opacity-[0.15] animate-float" style={{ animationDuration: "8s", animationDelay: "3s" }} />
        <div className="absolute top-[20%] right-[20%] w-10 h-10 bg-black border-[2px] border-white/20 rotate-45 opacity-[0.12] animate-float" style={{ animationDuration: "10s", animationDelay: "0.5s" }} />
        <div className="absolute bottom-[40%] right-[35%] w-8 h-8 bg-white border-[2px] border-black -rotate-6 opacity-[0.12] animate-float" style={{ animationDuration: "7s", animationDelay: "4s" }} />
        <div className="absolute top-[65%] left-[40%] w-16 h-16 bg-success/30 border-[2px] border-black/30 rotate-12 opacity-[0.15] animate-float" style={{ animationDuration: "8s", animationDelay: "1.5s" }} />

        <div className={`mx-auto max-w-7xl px-4 sm:px-6 text-center relative reveal-scale ${ctaInView ? "in-view" : ""}`}>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-5">
            Ready to start earning?
          </h2>
          <p className="text-lg mb-12 max-w-md mx-auto opacity-80">
            Connect your Freighter wallet and create your first quest. It takes
            two minutes.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="text-base shimmer-on-hover group"
            onClick={() => onNavigate("dashboard")}
          >
            Launch App
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* FOOTER                                        */}
      {/* ══════════════════════════════════════════════ */}
      <footer className="border-t-[3px] border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary border-[2px] border-black shadow-[2px_2px_0_#000] flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 512 512" className="h-6 w-6" aria-hidden="true">
                    <path
                      d="M 149 117 L 149 382 L 349 382 L 349 317 L 214 317 L 214 117 Z"
                      fill="#000000"
                    />
                  </svg>
                </div>
                <span className="font-black text-xl">Lernza</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                The first learn-to-earn platform on Stellar. Create quests, set
                milestones, reward learners with tokens.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-black text-sm uppercase tracking-wider mb-4">
                Resources
              </h4>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Documentation", href: "https://github.com/lernza/lernza" },
                  { label: "Contributing", href: "https://github.com/lernza/lernza/blob/main/CONTRIBUTING.md" },
                  { label: "MIT License", href: "https://github.com/lernza/lernza/blob/main/LICENSE" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors animated-underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div>
              <h4 className="font-black text-sm uppercase tracking-wider mb-4">
                Community
              </h4>
              <div className="flex gap-3">
                {[
                  { href: "https://github.com/lernza", label: "GitHub", Icon: Github },
                  { href: "https://x.com/lernza", label: "X", Icon: XIcon },
                  { href: "https://discord.gg/lernza", label: "Discord", Icon: DiscordIcon },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center neo-press hover:shadow-[4px_4px_0_#000] active:shadow-[1px_1px_0_#000] hover:bg-primary transition-colors"
                    aria-label={social.label}
                  >
                    <social.Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Join the community and help build the future of learn-to-earn.
              </p>
            </div>
          </div>

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
