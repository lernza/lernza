import { Wallet, LogOut } from "lucide-react"
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

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <path
        d="M 149 117 L 149 382 L 349 382 L 349 317 L 214 317 L 214 117 Z"
        fill="#000000"
        transform="translate(14, 14)"
      />
      <path
        d="M 149 117 L 149 382 L 349 382 L 349 317 L 214 317 L 214 117 Z"
        fill="#FACC15"
        stroke="#000000"
        strokeWidth="8"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

export function Navbar({ activePage, onNavigate }: NavbarProps) {
  const { connected, shortAddress, connect, disconnect, loading } = useWallet()

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-black bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <LogoMark className="h-8 w-8" />
          <span className="text-xl font-black tracking-tight">Lernza</span>
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
                "px-4 py-2 text-sm font-bold transition-all cursor-pointer border-[2px]",
                activePage === item.key
                  ? "bg-primary border-black shadow-[2px_2px_0_#000]"
                  : "border-transparent hover:border-black hover:bg-secondary"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {connected ? (
            <>
              <div className="hidden sm:flex items-center gap-2 border-[2px] border-black bg-secondary px-3 py-1.5 shadow-[2px_2px_0_#000]">
                <div className="h-2.5 w-2.5 bg-success border border-black" />
                <span className="text-sm font-mono font-bold">
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
