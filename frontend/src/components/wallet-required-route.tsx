import type { ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { LockKeyhole, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"

interface WalletRequiredRouteProps {
  children: ReactNode
  area: string
  description: string
}

export function WalletRequiredRoute({ children, area, description }: WalletRequiredRouteProps) {
  const { connected, connect, loading } = useWallet()
  const location = useLocation()

  if (connected) {
    return <>{children}</>
  }

  return (
    <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-40" />

      <div className="bg-card text-card-foreground border-border relative z-10 w-full max-w-xl overflow-hidden border-[3px] shadow-[8px_8px_0_var(--color-border)]">
        <div className="bg-primary border-border flex items-center justify-between border-b-[3px] px-6 py-3">
          <span className="text-xs font-black tracking-wider uppercase">{area}</span>
          <div className="flex items-center gap-2 text-xs font-bold uppercase">
            <div className="bg-destructive border-border h-2.5 w-2.5 border" />
            Wallet Required
          </div>
        </div>

        <div className="space-y-6 p-8 text-center sm:p-10">
          <div className="bg-primary border-border mx-auto flex h-18 w-18 items-center justify-center border-[3px] shadow-[4px_4px_0_var(--color-border)]">
            <LockKeyhole className="h-8 w-8" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-black sm:text-3xl">{area} requires a wallet</h1>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">{description}</p>
            <p className="text-muted-foreground mx-auto max-w-md text-xs font-bold">
              This route stays locked while disconnected so mock quests, earnings, and learner data
              are not presented as if they were live on-chain state.
            </p>
          </div>

          <div className="bg-secondary border-border inline-flex max-w-full items-center gap-2 border-[2px] px-3 py-2 text-xs font-bold shadow-[3px_3px_0_var(--color-border)]">
            <span className="text-muted-foreground uppercase">Attempted route</span>
            <span className="font-mono">{location.pathname}</span>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={connect} disabled={loading} className="shimmer-on-hover">
              <Wallet className="h-4 w-4" />
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
            <Link
              to="/"
              className="border-border bg-background neo-press hover:bg-primary inline-flex items-center justify-center border-[2px] px-4 py-2 text-sm font-black shadow-[3px_3px_0_var(--color-border)] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
