import { useState, useEffect } from "react"
import { ArrowLeft, Home, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NotFoundProps {
  onNavigate: (page: string) => void
}

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

export function NotFound({ onNavigate }: NotFoundProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="min-h-[calc(100vh-67px)] flex items-center justify-center relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-dots pointer-events-none" />

      {/* Floating background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[8%] left-[5%] w-28 h-28 bg-primary border-[3px] border-black shadow-[5px_5px_0_#000] rotate-12 opacity-[0.08] animate-float"
          style={{ animationDuration: "7s" }}
        />
        <div
          className="absolute top-[15%] right-[8%] w-20 h-20 bg-destructive border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-6 opacity-[0.07] animate-float"
          style={{ animationDuration: "9s", animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-[12%] left-[10%] w-16 h-16 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-45 opacity-[0.06] animate-float"
          style={{ animationDuration: "8s", animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[20%] right-[6%] w-24 h-24 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-12 opacity-[0.07] animate-float"
          style={{ animationDuration: "6s", animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-[50%] left-[50%] w-10 h-10 bg-success border-[2px] border-black shadow-[3px_3px_0_#000] rotate-6 opacity-[0.08] animate-float"
          style={{ animationDuration: "10s", animationDelay: "3s" }}
        />
        <div
          className="absolute top-[30%] left-[25%] w-8 h-8 bg-success border-[2px] border-black shadow-[2px_2px_0_#000] -rotate-45 opacity-[0.06] animate-float"
          style={{ animationDuration: "11s", animationDelay: "1.5s" }}
        />
        {/* Spinning decorative element */}
        <div
          className="absolute top-[65%] right-[15%] w-14 h-14 border-[3px] border-black opacity-[0.04] animate-spin-slow"
        />
      </div>

      <div className="relative flex flex-col items-center text-center px-4">
        {/* Giant 404 with glitch + stacked neo-brutalist layers */}
        <div
          className="relative mb-6 animate-scale-in"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Shadow layers */}
          <div className="absolute inset-0 text-[180px] sm:text-[240px] lg:text-[300px] font-black leading-none text-black translate-x-3 translate-y-3 opacity-100">
            404
          </div>
          <div
            className={`absolute inset-0 text-[180px] sm:text-[240px] lg:text-[300px] font-black leading-none text-primary translate-x-1.5 translate-y-1.5 transition-transform duration-300 ${
              hovered ? "translate-x-2.5 translate-y-2.5" : ""
            }`}
          >
            404
          </div>
          <div
            className="relative text-[180px] sm:text-[240px] lg:text-[300px] font-black leading-none text-white"
            style={{ WebkitTextStroke: "4px black" }}
          >
            <GlitchText text="404" />
          </div>
        </div>

        {/* Message card */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_#000] px-8 py-6 max-w-md animate-fade-in-up stagger-1 shimmer-on-hover">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-black">
              Lost in the chain
            </h2>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            This page doesn't exist on any ledger. It might have been moved,
            deleted, or never deployed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => onNavigate("landing")}
              className="shimmer-on-hover group"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.history.back()}
              className="group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Decorative accent blocks */}
        <div className="absolute -left-6 sm:-left-12 top-1/2 w-8 h-8 sm:w-12 sm:h-12 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-12 animate-fade-in-up stagger-2 hidden sm:block" />
        <div className="absolute -right-6 sm:-right-12 top-1/2 -translate-y-8 w-6 h-6 sm:w-10 sm:h-10 bg-success border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-6 animate-fade-in-up stagger-3 hidden sm:block" />
      </div>
    </div>
  )
}
