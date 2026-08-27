import { useState } from "react"
import { Wallet, LogOut, Menu, X, Sun, Moon, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"
import { NetworkIndicator, NetworkMismatchBanner } from "@/components/error-states"

const NAV_ITEMS = [
  { key: "landing", labelKey: "nav.home" as const },
  { key: "dashboard", labelKey: "nav.dashboard" as const },
  { key: "leaderboard", labelKey: "nav.leaderboard" as const },
  { key: "history", labelKey: "nav.history" as const },
  { key: "profile", labelKey: "nav.profile" as const },
] as const

interface NavbarProps {
  activePage: string
  onNavigate: (page: string) => void
  /** Optional callback to open the onboarding tutorial */
  onLaunchTutorial?: () => void
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
  const { theme, toggleTheme } = useColorScheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "border-border h-11 w-11 border shadow-sm sm:h-9 sm:w-9",
        "neo-press flex cursor-pointer items-center justify-center",
        "transition-colors duration-300",
        isDark
          ? "bg-accent text-black hover:bg-yellow-300"
          : "bg-background text-foreground hover:bg-secondary"
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function Navbar({ activePage, onNavigate, onLaunchTutorial }: NavbarProps) {
  const { connected, shortAddress, connect, disconnect, loading } = useWallet()
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavigate = (page: string) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  return (
    <header className="border-border bg-background sticky top-0 z-50 border-b transition-colors duration-300">
      <NetworkMismatchBanner />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => handleNavigate("landing")}
          aria-label="Go home"
          className="group flex cursor-pointer items-center gap-2"
        >
          <LogoMark className="h-8 w-8 transition-transform group-hover:scale-110" />
          <span className="text-xl font-semibold tracking-tight">Lernza</span>
        </button>

        {/* Desktop nav links */}
        <nav aria-label="Main navigation" className="hidden sm:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <li key={item.key}>
                <button
                  onClick={() => handleNavigate(item.key)}
                  data-onboarding={`nav-${item.key}`}
                  className={cn(
                    "animated-underline cursor-pointer border px-4 py-2 text-sm font-bold transition-all",
                    activePage === item.key
                      ? "bg-accent border-border active shadow-sm"
                      : "hover:border-border hover:bg-secondary border-transparent"
                  )}
                >
                  {t(item.labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right side: theme toggle + tutorial + wallet + mobile menu */}
        <div className="flex items-center gap-2">
          <NetworkIndicator />
          <ThemeToggle />

          {/* Tutorial launch button */}
          {onLaunchTutorial && (
            <button
              onClick={onLaunchTutorial}
              aria-label="Open getting started tutorial"
              title="Getting started guide"
              data-onboarding="tutorial-button"
              className={cn(
                "border-border h-11 w-11 border shadow-sm sm:h-9 sm:w-9",
                "neo-press flex cursor-pointer items-center justify-center",
                "bg-background text-foreground hover:bg-secondary transition-colors duration-300"
              )}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {connected ? (
            <>
              <div className="border-border bg-secondary hidden items-center gap-2 border px-3 py-1.5 shadow-sm sm:flex">
                <div className="bg-success border-border h-2.5 w-2.5 border" />
                <span className="font-mono text-sm font-bold">{shortAddress}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnect}
                aria-label="Disconnect wallet"
                className="h-11 w-11 sm:h-9 sm:w-9"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button
              onClick={connect}
              disabled={loading}
              size="sm"
              className="shimmer-on-hover"
              data-onboarding="connect-wallet"
            >
              <Wallet className="h-4 w-4" />
              {loading ? t("nav.connecting") : t("nav.connectWallet")}
            </Button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            className="border-border bg-background neo-press flex h-11 w-11 cursor-pointer items-center justify-center border shadow-sm sm:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <nav
          aria-label="Main navigation"
          id="mobile-nav-menu"
          className="border-border bg-background animate-fade-in-down border-t transition-colors duration-300 sm:hidden"
        >
          <ul className="space-y-1 px-4 py-3">
            {NAV_ITEMS.map(item => (
              <li key={item.key}>
                <button
                  onClick={() => handleNavigate(item.key)}
                  className={cn(
                    "w-full cursor-pointer border px-4 py-3 text-left text-sm font-bold transition-all",
                    activePage === item.key
                      ? "bg-accent border-border shadow-sm"
                      : "hover:border-border hover:bg-secondary border-transparent"
                  )}
                >
                  {t(item.labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
