import { useEffect, useRef, useState } from "react"
import { Check, Globe } from "lucide-react"
import { useTranslation } from "@/i18n"
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/types"
import { cn } from "@/lib/utils"

/**
 * Compact locale switcher. Keeps the current choice in `localStorage` and
 * updates `<html lang>` so screen readers announce the right language.
 * See issue #1616.
 */
export function LanguageSelector() {
  const { locale, setLocale, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const label = t("nav.language")

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t("nav.selectLanguage")}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-onboarding="language-selector"
        className={cn(
          "border-border h-11 w-11 border shadow-sm sm:h-9 sm:w-9",
          "neo-press flex cursor-pointer items-center justify-center",
          "transition-colors duration-300",
          open
            ? "bg-accent text-black"
            : "bg-background text-foreground hover:bg-secondary"
        )}
      >
        <Globe className="h-4 w-4" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="border-border bg-background animate-scale-in absolute right-0 z-50 mt-2 w-44 border p-1 shadow-xl"
        >
          {LOCALES.map(candidate => (
            <li key={candidate}>
              <button
                type="button"
                role="option"
                aria-selected={candidate === locale}
                onClick={() => {
                  setLocale(candidate as Locale)
                  setOpen(false)
                }}
                className={cn(
                  "hover:bg-secondary flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                  candidate === locale && "bg-accent/20 font-semibold"
                )}
              >
                <span lang={candidate}>{LOCALE_LABELS[candidate]}</span>
                {candidate === locale && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
