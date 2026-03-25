import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Home, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

function GlitchText({ text }: { text: string }) {
  const [glitchActive, setGlitchActive] = useState(true)

  useEffect(() => {
    // Periodic glitch bursts
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 400)
    }, 3000)
    // Initial burst
    const initialTimeout = setTimeout(() => setGlitchActive(false), 800)
    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [])

  return (
    <div
      className={`glitch-text relative select-none ${glitchActive ? "" : "[&::before]:!animation-play-state-paused [&::after]:!animation-play-state-paused"}`}
      data-text={text}
    >
      {text}
    </div>
  )
}

export function NotFound() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
      {/* Animated background grid */}
      <div className="bg-grid-dots pointer-events-none absolute inset-0" />

      {/* Floating background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="bg-primary border-border animate-float absolute top-[8%] left-[5%] h-28 w-28 rotate-12 border-[3px] opacity-[0.08] shadow-[5px_5px_0_var(--color-border)]"
          style={{ animationDuration: "7s" }}
        />
        <div
          className="bg-destructive border-border animate-float absolute top-[15%] right-[8%] h-20 w-20 -rotate-6 border-[3px] opacity-[0.07] shadow-[4px_4px_0_var(--color-border)]"
          style={{ animationDuration: "9s", animationDelay: "1s" }}
        />
        <div
          className="bg-primary border-border animate-float absolute bottom-[12%] left-[10%] h-16 w-16 rotate-45 border-[2px] opacity-[0.06] shadow-[3px_3px_0_var(--color-border)]"
          style={{ animationDuration: "8s", animationDelay: "2s" }}
        />
        <div
          className="bg-primary border-border animate-float absolute right-[6%] bottom-[20%] h-24 w-24 -rotate-12 border-[3px] opacity-[0.07] shadow-[4px_4px_0_var(--color-border)]"
          style={{ animationDuration: "6s", animationDelay: "0.5s" }}
        />
        <div
          className="bg-success border-border animate-float absolute top-[50%] left-[50%] h-10 w-10 rotate-6 border-[2px] opacity-[0.08] shadow-[3px_3px_0_var(--color-border)]"
          style={{ animationDuration: "10s", animationDelay: "3s" }}
        />
        <div
          className="bg-success border-border animate-float absolute top-[30%] left-[25%] h-8 w-8 -rotate-45 border-[2px] opacity-[0.06] shadow-[2px_2px_0_var(--color-border)]"
          style={{ animationDuration: "11s", animationDelay: "1.5s" }}
        />
        {/* Spinning decorative element */}
        <div className="border-border animate-spin-slow absolute top-[65%] right-[15%] h-14 w-14 border-[3px] opacity-[0.04]" />
      </div>

      <div className="relative flex flex-col items-center px-4 text-center">
        {/* Giant 404 with glitch + stacked neo-brutalist layers */}
        <div
          className="animate-scale-in relative mb-6"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Shadow layers */}
          <div className="text-foreground absolute inset-0 translate-x-3 translate-y-3 text-[180px] leading-none font-black opacity-100 sm:text-[240px] lg:text-[300px]">
            404
          </div>
          <div
            className={`text-primary absolute inset-0 translate-x-1.5 translate-y-1.5 text-[180px] leading-none font-black transition-transform duration-300 sm:text-[240px] lg:text-[300px] ${
              hovered ? "translate-x-2.5 translate-y-2.5" : ""
            }`}
          >
            404
          </div>
          <div
            className="relative text-[180px] leading-none font-black text-white sm:text-[240px] lg:text-[300px]"
            style={{ WebkitTextStroke: "4px black" }}
          >
            <GlitchText text="404" />
          </div>
        </div>

        {/* Message card */}
        <div className="bg-background border-border animate-fade-in-up stagger-1 shimmer-on-hover max-w-md border-[3px] px-8 py-6 shadow-[6px_6px_0_var(--color-border)]">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Sparkles className="text-primary h-5 w-5" />
            <h2 className="text-2xl font-black sm:text-3xl">Lost in the chain</h2>
            <Sparkles className="text-primary h-5 w-5" />
          </div>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            This page doesn't exist on any ledger. It might have been moved, deleted, or never
            deployed.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate("/")} className="shimmer-on-hover group">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
            <Button variant="secondary" onClick={() => window.history.back()} className="group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Decorative accent blocks */}
        <div className="bg-primary border-border animate-fade-in-up stagger-2 absolute top-1/2 -left-6 hidden h-8 w-8 rotate-12 border-[2px] shadow-[3px_3px_0_var(--color-border)] sm:-left-12 sm:block sm:h-12 sm:w-12" />
        <div className="bg-success border-border animate-fade-in-up stagger-3 absolute top-1/2 -right-6 hidden h-6 w-6 -translate-y-8 -rotate-6 border-[2px] shadow-[3px_3px_0_var(--color-border)] sm:-right-12 sm:block sm:h-10 sm:w-10" />
      </div>
    </div>
  )
}
