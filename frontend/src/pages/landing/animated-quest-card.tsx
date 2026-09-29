import { useState, useEffect } from "react"
import { CheckCircle2, Sparkles } from "lucide-react"

/** Looping hero illustration: a demo quest card that fills in its milestones. */
export function AnimatedQuestCard() {
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
      <div className="bg-accent/20 border-border absolute -top-3 -left-3 h-full w-full border" />
      <div className="bg-accent/40 border-border absolute -top-1.5 -left-1.5 h-full w-full border" />

      {/* Main quest card */}
      <div className="bg-card text-card-foreground border-border relative overflow-hidden border shadow-xl">
        {/* Card header */}
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Active Quest</span>
            <span className="bg-secondary/80 text-secondary-foreground border-border rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Example Demo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-success border-border h-2.5 w-2.5 border" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="mb-1 text-xl font-semibold">Stellar Dev Bootcamp</h3>
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
                    {done && <CheckCircle2 className="animate-scale-in h-3.5 w-3.5" />}
                  </div>
                  <span
                    className={`flex-1 text-sm font-bold transition-all duration-500 ${
                      done ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {m.label}
                  </span>
                  <span
                    className={`border-border border-[1.5px] px-2 py-0.5 text-xs font-bold shadow-sm transition-colors duration-500 ${
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
          <div className="border-border bg-secondary h-5 w-full border shadow-sm">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isComplete ? "bg-success" : "bg-accent"
              }`}
              style={{ width: `${progress}%` }}
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
            <span className="text-success text-sm font-semibold transition-all duration-300">
              +{totalEarned} USDC
            </span>
          </div>

          {/* Quest complete banner */}
          {isComplete && (
            <div className="bg-success border-border animate-bounce-in mt-4 border-2 px-4 py-2.5 text-center">
              <span className="flex items-center justify-center gap-2 text-sm font-semibold">
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
          className="bg-success border-border animate-bounce-in absolute -right-4 -bottom-5 border-2 px-4 py-2.5 shadow-md"
        >
          <span className="text-sm font-semibold">
            +{milestones[completedCount - 1]?.reward} USDC
          </span>
        </div>
      )}
    </div>
  )
}
