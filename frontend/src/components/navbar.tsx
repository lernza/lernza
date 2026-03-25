import { useState } from "react"
import { Wallet, LogOut, Menu, X, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useTheme } from "@/App"
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

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "w-9 h-9 border-[2px] border-border shadow-[2px_2px_0_var(--color-border)]",
        "flex items-center justify-center neo-press cursor-pointer",
        "transition-colors duration-300",
        isDark
          ? "bg-primary text-black hover:bg-yellow-300"
          : "bg-background text-foreground hover:bg-secondary"
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function Navbar({ activePage, onNavigate }: NavbarProps) {
  const { connected, shortAddress, connect, disconnect, loading } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavigate = (page: string) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-border bg-background transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => handleNavigate("landing")}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <LogoMark className="h-8 w-8 transition-transform group-hover:scale-110" />
          <span className="text-xl font-black tracking-tight">Lernza</span>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={cn(
                "px-4 py-2 text-sm font-bold transition-all cursor-pointer border-[2px] animated-underline",
                activePage === item.key
                  ? "bg-primary border-border shadow-[2px_2px_0_var(--color-border)] active"
                  : "border-transparent hover:border-border hover:bg-secondary"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side: theme toggle + wallet + mobile menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {connected ? (
            <>
              <div className="hidden sm:flex items-center gap-2 border-[2px] border-border bg-secondary px-3 py-1.5 shadow-[2px_2px_0_var(--color-border)]">
                <div className="h-2.5 w-2.5 bg-success border border-border" />
                <span className="text-sm font-mono font-bold">{shortAddress}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={disconnect}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={connect} disabled={loading} size="sm" className="shimmer-on-hover">
              <Wallet className="h-4 w-4" />
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden w-9 h-9 border-[2px] border-border bg-background shadow-[2px_2px_0_var(--color-border)] flex items-center justify-center neo-press cursor-pointer"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t-[3px] border-border bg-background animate-fade-in-down transition-colors duration-300">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm font-bold transition-all cursor-pointer border-[2px]",
                  activePage === item.key
                    ? "bg-primary border-border shadow-[2px_2px_0_var(--color-border)]"
                    : "border-transparent hover:border-border hover:bg-secondary"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}