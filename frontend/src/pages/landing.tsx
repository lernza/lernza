import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
  Star,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInView, useTypewriter } from "@/hooks/use-animations"
import { PlatformStats } from "./dashboard/platform-stats"
import { MOCK_PLATFORM_STATS } from "@/lib/mock-data"

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
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
      setStep(s => (s + 1) % 6)
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
  const totalEarned = milestones.slice(0, completedCount).reduce((s, m) => s + m.reward, 0)
  const isComplete = completedCount >= 3

  return (
    <div className="relative">
      {/* Stacked back cards */}
      <div className="bg-primary/20 border-border absolute -top-3 -left-3 h-full w-full border-[3px]" />
      <div className="bg-primary/40 border-border absolute -top-1.5 -left-1.5 h-full w-full border-[3px]" />

      {/* Main quest card */}
      <div className="bg-card text-card-foreground border-border relative overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
        {/* Card header */}
        <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
          <span className="text-xs font-black tracking-wider uppercase">Active Quest</span>
          <div className="flex items-center gap-1.5">
            <div className="bg-success border-border h-2.5 w-2.5 border" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="mb-1 text-xl font-black">Stellar Dev Bootcamp</h3>
          <p className="text-muted-foreground mb-6 text-sm">8 enrolled &middot; 1,000 USDC pool</p>

          {/* Milestones with animated check states */}
          <div className="mb-6 space-y-4">
            {milestones.map((m, i) => {
              const done = i < completedCount
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <div
                    className={`border-border flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-all duration-500 ${
                      done ? "bg-success scale-110" : "bg-card"
                    }`}
                  >
                    {done && (
                      <CheckCircle2 className="animate-scale-in h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </div>
                  <span
                    className={`flex-1 text-sm font-bold transition-all duration-500 ${
                      done ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {m.label}
                  </span>
                  <span
                    className={`border-border border-[1.5px] px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_var(--color-border)] transition-colors duration-500 ${
                      done ? "bg-success" : "bg-secondary"
                    }`}
                  >
                    {m.reward} USDC
                  </span>
                </div>
              )
            })}
          </div>

          {/* Animated progress bar */}
          <div
            className="border-border bg-secondary h-5 w-full border-[3px] shadow-[2px_2px_0_var(--color-border)]"
            aria-hidden="true"
          >
            <div
              className="bg-primary animate-float absolute -bottom-7 -left-5 h-8 w-8 -rotate-6 border-[2px] border-black shadow-[2px_2px_0_#000]"
              style={{ animationDelay: "2s" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-muted-foreground text-xs font-bold">
              {completedCount} of 3 milestones
            </p>
            <p className="text-muted-foreground text-xs font-bold">{Math.round(progress)}%</p>
          </div>

          {/* Earned bar */}
          <div
            className={`border-border mt-4 flex items-center justify-between border-2 px-4 py-2 transition-all duration-500 ${
              isComplete ? "bg-success/20" : "bg-success/10"
            }`}
          >
            <span className="text-muted-foreground text-xs font-bold">Total earned</span>
            <span className="text-success text-sm font-black transition-all duration-300">
              +{totalEarned} USDC
            </span>
          </div>

          {/* Quest complete banner */}
          {isComplete && (
            <div className="bg-success border-border animate-bounce-in mt-4 border-2 px-4 py-2.5 text-center">
              <span className="flex items-center justify-center gap-2 text-sm font-black">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Quest Complete!
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating earned badge */}
      {completedCount > 0 && !isComplete && (
        <div
          key={completedCount}
          className="bg-success border-border animate-bounce-in absolute -right-4 -bottom-5 border-2 px-4 py-2.5 shadow-[3px_3px_0_var(--color-border)]"
        >
          <span className="text-sm font-black">+{milestones[completedCount - 1]?.reward} USDC</span>
        </div>
      )}

      {/* Floating accent blocks */}
      <div
        className="bg-primary border-border animate-float absolute -top-8 -right-6 h-10 w-10 rotate-12 border-2 shadow-[3px_3px_0_var(--color-border)]"
        aria-hidden="true"
      />
      <div
        className="bg-primary border-border animate-float absolute -bottom-7 -left-5 h-8 w-8 -rotate-6 border-2 shadow-[2px_2px_0_var(--color-border)]"
        style={{ animationDelay: "2s" }}
        aria-hidden="true"
      />
    </div>
  )
}

/* ─── Marquee Banner ─── */

function MarqueeBanner() {
  const items = ["LEARN TO EARN ON STELLAR", "ON THE DRIPS WAVE", "ON-CHAIN REWARDS, NO MIDDLEMEN"]
  const repeated = Array.from({ length: 8 }, () => items).flat()

  return (
    <div className="border-border bg-primary overflow-hidden border-y-[3px] select-none">
      <div className="animate-marquee flex py-3.5 whitespace-nowrap">
        <div className="flex shrink-0">
          {repeated.map((item, i) => (
            <span key={`a-${i}`} className="mx-5 flex items-center gap-4">
              <span className="text-sm font-black tracking-wider uppercase">{item}</span>
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </span>
          ))}
        </div>
        <div className="flex shrink-0">
          {repeated.map((item, i) => (
            <span key={`b-${i}`} className="mx-5 flex items-center gap-4">
              <span className="text-sm font-black tracking-wider uppercase">{item}</span>
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Landing Component ─── */

export function Landing() {
  const navigate = useNavigate()
  const subtitle = useTypewriter(
    "Create quests, set milestones, and reward learners with tokens. The first learn-to-earn platform on Stellar.",
    25
  )

  const [howRef, howInView] = useInView()
  const [featRef, featInView] = useInView()
  const [ctaRef, ctaInView] = useInView()

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative flex min-h-[calc(100vh-67px)] items-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />

        {/* Decorative floating shapes — intentionally low opacity, borders stay border-border */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="bg-primary border-border animate-float absolute top-[6%] left-[3%] h-20 w-20 rotate-12 border-[3px] opacity-[0.08] shadow-[4px_4px_0_var(--color-border)]"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="bg-primary border-border animate-float absolute top-[14%] right-[6%] h-14 w-14 -rotate-6 border-2 opacity-[0.1] shadow-[3px_3px_0_var(--color-border)]"
            style={{ animationDuration: "6s", animationDelay: "1s" }}
          />
          <div
            className="bg-success border-border animate-float absolute bottom-[22%] left-[7%] h-10 w-10 rotate-45 border-2 opacity-[0.06] shadow-[3px_3px_0_var(--color-border)]"
            style={{ animationDuration: "7s", animationDelay: "2s" }}
          />
          <div
            className="bg-foreground animate-float absolute top-[42%] right-[3%] h-8 w-8 rotate-12 opacity-[0.04]"
            style={{ animationDuration: "9s", animationDelay: "0.5s" }}
          />
          <div
            className="bg-primary border-border animate-float absolute right-[10%] bottom-[16%] h-16 w-16 -rotate-12 border-2 opacity-[0.08] shadow-[3px_3px_0_var(--color-border)]"
            style={{ animationDuration: "7s", animationDelay: "3s" }}
          />
          <div
            className="bg-primary border-border animate-float absolute top-[55%] left-[14%] h-6 w-6 rotate-6 border-2 opacity-[0.1]"
            style={{ animationDuration: "5s", animationDelay: "1.5s" }}
          />
          <div
            className="bg-primary border-border animate-float absolute top-[4%] left-[42%] h-12 w-12 rotate-45 border-2 opacity-[0.05] shadow-[2px_2px_0_var(--color-border)]"
            style={{ animationDuration: "10s", animationDelay: "2s" }}
          />
          <div
            className="bg-success border-border animate-float absolute top-[75%] right-[25%] h-5 w-5 rotate-12 border opacity-[0.08]"
            style={{ animationDuration: "6s", animationDelay: "3.5s" }}
          />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="py-20 lg:py-0">
              <div className="bg-primary border-border animate-fade-in-up shimmer-on-hover mb-10 inline-flex cursor-default items-center gap-2 border-2 px-4 py-2 text-sm font-bold shadow-[3px_3px_0_var(--color-border)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Built on Stellar
              </div>

              <h1 className="mb-10 text-6xl leading-[0.88] font-black tracking-tight sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem]">
                <span className="sr-only">Learn. Earn. On-chain.</span>
                <span className="animate-slide-in-left block" aria-hidden="true">Learn.</span>
                <span className="animate-slide-in-left stagger-2 block" aria-hidden="true">
                  <span className="bg-primary border-border my-2 inline-block -rotate-2 cursor-default border-[3px] px-4 py-2 shadow-[6px_6px_0_var(--color-border)] transition-all duration-300 hover:rotate-0 hover:shadow-[8px_8px_0_var(--color-border)]">
                    Earn.
                  </span>
                </span>
                <span className="animate-slide-in-left stagger-3 block" aria-hidden="true">On-chain.</span>
              </h1>

              <p className="text-muted-foreground animate-fade-in stagger-4 mb-12 h-[3.5em] max-w-lg text-xl leading-relaxed">
                <span>{subtitle}</span>
                <span className="typewriter-cursor" />
              </p>

              <div className="animate-fade-in-up stagger-5 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="shimmer-on-hover group text-base"
                  onClick={() => navigate("/dashboard")}
                >
                  Launch App
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
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
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="animate-fade-in-up stagger-6 mt-14 flex flex-wrap gap-6">
                {[
                  { color: "bg-primary", text: "3 smart contracts" },
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

        <div className="absolute right-0 bottom-0 left-0">
          <MarqueeBanner />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        ref={howRef}
        className="bg-secondary relative overflow-hidden py-24 sm:py-32"
      >
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className={`reveal-up mb-16 text-center ${howInView ? "in-view" : ""}`}>
            <div className="bg-primary border-border mb-6 inline-block border-2 px-4 py-2 shadow-[3px_3px_0_var(--color-border)]">
              <span className="text-sm font-black tracking-wider uppercase">How it works</span>
            </div>
            <h2 className="text-4xl font-black sm:text-5xl">Three steps. Zero complexity.</h2>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-0 sm:grid-cols-3">
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
                  className={`bg-card text-card-foreground border-border card-tilt reveal-up relative flex-1 border-[3px] p-8 shadow-[6px_6px_0_var(--color-border)] ${howInView ? "in-view" : ""} shimmer-on-hover group`}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <div className="text-primary/15 group-hover:text-primary/25 pointer-events-none absolute top-3 right-4 text-[80px] leading-none font-black transition-colors duration-300 select-none">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="bg-primary border-border mb-6 flex h-14 w-14 items-center justify-center border-2 shadow-[3px_3px_0_var(--color-border)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[5px_5px_0_var(--color-border)]">
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 text-xl font-black">{item.title}</h3>
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

      {/* PLATFORM STATS (Marketing) */}
      <section className="bg-background relative border-t-[3px] border-border py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-black sm:text-3xl">Platform at a glance</h2>
            <p className="text-muted-foreground mt-2 font-bold">
              Sample statistics for preview. Real-time on-chain metrics coming soon.
            </p>
          </div>
          <PlatformStats stats={MOCK_PLATFORM_STATS} />
        </div>
      </section>

      {/* FEATURES */}
      <section
        ref={featRef}
        className="border-border relative overflow-hidden border-t-[3px] py-24 sm:py-32"
      >
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className={`reveal-up mb-16 text-center ${featInView ? "in-view" : ""}`}>
            <h2 className="mb-5 text-4xl font-black sm:text-5xl">Why Lernza?</h2>
            <p className="text-muted-foreground mx-auto max-w-lg text-lg">
              Real incentives drive real learning. Everything on-chain, everything verifiable.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                className={`border-border bg-card text-card-foreground card-tilt shimmer-on-hover group reveal-up border-[3px] shadow-[6px_6px_0_var(--color-border)] ${featInView ? "in-view" : ""} ${feature.large ? "p-10" : "p-8"}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div
                  className={`h-14 w-14 ${feature.accent} border-border mb-6 flex items-center justify-center border-2 shadow-[3px_3px_0_var(--color-border)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[5px_5px_0_var(--color-border)]`}
                >
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className={`mb-3 font-black ${feature.large ? "text-2xl" : "text-lg"}`}>
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

      {/* CTA — lives on bg-primary so its internal decoration can stay semi-literal */}
      <section
        ref={ctaRef}
        className="border-border bg-primary relative overflow-hidden border-t-[3px] py-24 sm:py-32"
      >
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-50" />
        {/* Decorative blocks inside a yellow section — rgba shadows are fine here */}
        <div aria-hidden="true">
          <div
            className="bg-background border-border animate-float absolute top-8 left-[4%] h-24 w-24 rotate-12 border-[3px] opacity-20 shadow-[5px_5px_0_rgba(0,0,0,0.2)]"
            style={{ animationDuration: "7s" }}
          />
          <div
            className="bg-foreground border-border/20 animate-float absolute right-[6%] bottom-8 h-20 w-20 -rotate-6 border-[3px] opacity-20"
            style={{ animationDuration: "9s", animationDelay: "2s" }}
          />
          <div
            className="bg-success border-border animate-float absolute top-[40%] left-[78%] h-14 w-14 rotate-45 border-[3px] opacity-[0.18] shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
            style={{ animationDuration: "6s", animationDelay: "1s" }}
          />
          <div
            className="bg-background border-border animate-float absolute bottom-[25%] left-[12%] h-12 w-12 -rotate-12 border-[3px] opacity-[0.15] shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
            style={{ animationDuration: "8s", animationDelay: "3s" }}
          />
          <div
            className="bg-foreground border-border/20 animate-float absolute top-[20%] right-[20%] h-10 w-10 rotate-45 border-2 opacity-[0.12]"
            style={{ animationDuration: "10s", animationDelay: "0.5s" }}
          />
          <div
            className="bg-background border-border animate-float absolute right-[35%] bottom-[40%] h-8 w-8 -rotate-6 border-2 opacity-[0.12]"
            style={{ animationDuration: "7s", animationDelay: "4s" }}
          />
          <div
            className="bg-success/30 border-border/30 animate-float absolute top-[65%] left-[40%] h-16 w-16 rotate-12 border-2 opacity-[0.15]"
            style={{ animationDuration: "8s", animationDelay: "1.5s" }}
          />
        </div>

        <div
          className={`reveal-scale relative mx-auto max-w-7xl px-4 text-center sm:px-6 ${ctaInView ? "in-view" : ""}`}
        >
          <h2 className="mb-5 text-4xl font-black sm:text-5xl lg:text-6xl">
            Ready to start earning?
          </h2>
          <p className="mx-auto mb-12 max-w-md text-lg opacity-80">
            Connect your Freighter wallet and create your first quest. It takes two minutes.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="shimmer-on-hover group text-base"
            onClick={() => navigate("/dashboard")}
          >
            Launch App
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-border bg-background border-t-[3px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-primary border-border flex h-8 w-8 items-center justify-center overflow-hidden border-2 shadow-[2px_2px_0_var(--color-border)]">
                  <svg viewBox="0 0 512 512" className="h-6 w-6" aria-hidden="true">
                    <path
                      d="M 149 117 L 149 382 L 349 382 L 349 317 L 214 317 L 214 117 Z"
                      fill="#000000"
                    />
                  </svg>
                </div>
                <span className="text-xl font-black">Lernza</span>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                The first learn-to-earn platform on Stellar. Create quests, set milestones, reward
                learners with tokens.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="mb-4 text-sm font-black tracking-wider uppercase">Resources</h4>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Documentation", href: "https://github.com/lernza/lernza" },
                  {
                    label: "Contributing",
                    href: "https://github.com/lernza/lernza/blob/main/CONTRIBUTING.md",
                  },
                  {
                    label: "MIT License",
                    href: "https://github.com/lernza/lernza/blob/main/LICENSE",
                  },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground animated-underline text-sm font-bold transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div>
              <h4 className="mb-4 text-sm font-black tracking-wider uppercase">Community</h4>
              <div className="flex gap-3">
                {[
                  { href: "https://github.com/lernza", label: "GitHub", Icon: GithubIcon },
                  { href: "https://x.com/lernza", label: "X", Icon: XIcon },
                  { href: "https://discord.gg/lernza", label: "Discord", Icon: DiscordIcon },
                ].map(social => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-card border-border neo-press hover:bg-primary flex h-10 w-10 items-center justify-center border-2 shadow-[3px_3px_0_var(--color-border)] transition-colors hover:shadow-[4px_4px_0_var(--color-border)] active:shadow-[1px_1px_0_var(--color-border)]"
                    aria-label={social.label}
                  >
                    <social.Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
              <p className="text-muted-foreground mt-4 text-xs">
                Join the community and help build the future of learn-to-earn.
              </p>
            </div>
          </div>

          <div className="border-border flex flex-col items-center justify-between gap-3 border-t-2 py-5 sm:flex-row">
            <p className="text-muted-foreground text-xs font-bold">
              Built on Stellar &middot; Open source &middot; MIT License
            </p>
            <p className="text-muted-foreground text-xs">
              &copy; {new Date().getFullYear()} Lernza
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
