import { useState } from "react"
import { Wallet, LogOut, Menu, X, Sun, Moon, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useWallet } from "@/hooks/use-wallet"
import { useTheme } from "@/hooks/use-theme"
import { useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { key: "landing", path: "/", label: "Home" },
  { key: "dashboard", path: "/dashboard", label: "Dashboard" },
  { key: "leaderboard", path: "/leaderboard", label: "Leaderboard" },
  { key: "profile", path: "/profile", label: "Profile" },
] as const

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
        "border-border h-9 w-9 border-[2px] shadow-[2px_2px_0_var(--color-border)]",
        "neo-press flex cursor-pointer items-center justify-center",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
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

export function Navbar() {
  const {
    connected,
    shortAddress,
    connect,
    disconnect,
    loading,
    installed,
    installUrl,
    networkName,
    wrongNetwork,
    expectedNetworkName,
  } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const activePage = location.pathname === "/" ? "landing" : location.pathname.split("/")[1]

  const handleNavigate = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <header className="border-border bg-background sticky top-0 z-50 border-b-[3px] transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => handleNavigate("/")}
          className="group focus-visible:ring-ring flex cursor-pointer items-center gap-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          <LogoMark className="h-8 w-8 transition-transform group-hover:scale-110" />
          <span className="text-xl font-black tracking-tight">Lernza</span>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "animated-underline focus-visible:ring-ring cursor-pointer border-[2px] px-4 py-2 text-sm font-bold transition-all focus-visible:ring-2 focus-visible:outline-none",
                activePage === item.key
                  ? "bg-primary border-border active shadow-[2px_2px_0_var(--color-border)]"
                  : "hover:border-border hover:bg-secondary border-transparent"
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
              <div className="border-border bg-secondary hidden items-center gap-2 border-[2px] px-3 py-1.5 shadow-[2px_2px_0_var(--color-border)] sm:flex">
                <div className="bg-success border-border h-2.5 w-2.5 border" />
                {networkName ? (
                  <span className="border-border bg-background rounded-sm border px-1.5 py-0.5 text-[10px] font-black tracking-wide uppercase">
                    {networkName}
                  </span>
                ) : null}
                <span className="font-mono text-sm font-bold">{shortAddress}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={disconnect}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : !installed ? (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "shimmer-on-hover")}
            >
              Install Freighter
            </a>
          ) : (
            <Button onClick={connect} disabled={loading} size="sm" className="shimmer-on-hover">
              <Wallet className="h-4 w-4" />
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="border-border bg-background neo-press focus-visible:ring-ring flex h-9 w-9 cursor-pointer items-center justify-center border-[2px] shadow-[2px_2px_0_var(--color-border)] focus-visible:ring-2 focus-visible:outline-none sm:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {connected && wrongNetwork ? (
        <div className="border-border border-t-[2px] bg-yellow-400 px-4 py-3 text-black dark:bg-yellow-500 dark:text-black">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-black">
                  Wrong network - switch Freighter to {expectedNetworkName}
                </p>
                <p className="mt-0.5 text-xs font-semibold opacity-80">
                  You are on <span className="font-black">{networkName ?? "Unknown"}</span>. Lernza
                  runs on {expectedNetworkName}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="border border-black/30 bg-black/10 px-2 py-1">
                1. Open Freighter
              </span>
              <span className="opacity-60">→</span>
              <span className="border border-black/30 bg-black/10 px-2 py-1">
                2. Click network dropdown
              </span>
              <span className="opacity-60">→</span>
              <span className="border border-black/30 bg-black/10 px-2 py-1">
                3. Select {expectedNetworkName}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="border-border bg-background animate-fade-in-down border-t-[3px] transition-colors duration-300 sm:hidden">
          <div className="space-y-1 px-4 py-3">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "focus-visible:ring-ring w-full cursor-pointer border-[2px] px-4 py-3 text-left text-sm font-bold transition-all focus-visible:ring-2 focus-visible:outline-none",
                  activePage === item.key
                    ? "bg-primary border-border shadow-[2px_2px_0_var(--color-border)]"
                    : "hover:border-border hover:bg-secondary border-transparent"
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
