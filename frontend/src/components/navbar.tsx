import { Zap, Wallet, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { key: "landing", label: "Home" },
  { key: "dashboard", label: "Dashboard" },
  { key: "profile", label: "Profile" },
] as const

interface NavbarProps {
  activePage: string
  onNavigate: (page: string) => void
}

export function Navbar({ activePage, onNavigate }: NavbarProps) {
  const { connected, shortAddress, connect, disconnect, loading } = useWallet()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Lernza</span>
        </button>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.filter((item) =>
            item.key === "landing" ? true : connected
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer",
                activePage === item.key
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-mono text-muted-foreground">
                  {shortAddress}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={disconnect}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={connect} disabled={loading} size="sm">
              <Wallet className="h-4 w-4" />
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
