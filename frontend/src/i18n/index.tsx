import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { translations } from "./en"
import type { TranslationKey, Locale, I18nContextValue } from "./types"

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = "lernza-locale"

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "en") return stored
  } catch {
    // ignore localStorage errors
  }
  return "en"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // ignore localStorage errors
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[key] ?? key
    },
    [locale]
  )

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider")
  }
  return ctx
}
