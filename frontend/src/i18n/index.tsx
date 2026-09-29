import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react"
import en from "./locales/en.json"
import es from "./locales/es.json"
import fr from "./locales/fr.json"
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALES,
  LOCALE_TAGS,
  type I18nContextValue,
  type Locale,
  type TranslationKey,
  type TranslationParams,
  type TranslationValue
} from "./types"

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = "lernza-locale"

type Catalog = Record<string, TranslationValue>

const CATALOGS: Record<Locale, Catalog> = { en, es, fr }

const interpolations = new WeakMap<Catalog, Intl.PluralRules>()

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isLocale(stored)) return stored
  } catch {
    // ignore localStorage errors
  }
  return DEFAULT_LOCALE
}

/** Picks the browser's preferred locale when it is one we ship. */
function getPreferredLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE
  for (const candidate of navigator.languages ?? [navigator.language]) {
    if (!candidate) continue
    const base = candidate.split("-")[0].toLowerCase()
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

function lookup(catalog: Catalog, key: string): TranslationValue | undefined {
  return Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : undefined
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
    const value = params[token]
    return value === undefined ? match : String(value)
  })
}

/**
 * Resolves a plural group using CLDR rules for the active locale, preferring
 * an exact `=N` entry when one exists.
 */
function resolvePlural(
  group: Record<string, string>,
  params: TranslationParams | undefined,
  locale: Locale
): string | undefined {
  const raw = params?.count
  const count = typeof raw === "bigint" ? Number(raw) : typeof raw === "number" ? raw : Number(raw)

  if (Number.isFinite(count)) {
    const exact = group[`=${count}`]
    if (exact) return exact

    const catalog = CATALOGS[locale]
    let pluralRules = interpolations.get(catalog)
    if (!pluralRules) {
      pluralRules = new Intl.PluralRules(LOCALE_TAGS[locale])
      interpolations.set(catalog, pluralRules)
    }
    const category = pluralRules.select(count)
    if (group[category]) return group[category]
  }

  return group.other
}

function translate(
  key: string,
  locale: Locale,
  params?: TranslationParams
): string {
  const primary = lookup(CATALOGS[locale], key)
  const value = primary ?? lookup(CATALOGS[FALLBACK_LOCALE], key)

  if (value === undefined) return key
  if (typeof value === "string") return interpolate(value, params)

  const resolved = resolvePlural(value, params, locale)
  return resolved ? interpolate(resolved, params) : key
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

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

  // Keep assistive tech and CSS `:lang()` selectors in sync with the choice.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(key, locale, params),
    [locale]
  )

  const formatDate = useCallback(
    (value: Date | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(LOCALE_TAGS[locale], options).format(new Date(value)),
    [locale]
  )

  const formatDateTime = useCallback(
    (value: Date | number) =>
      new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value)),
    [locale]
  )

  const formatNumber = useCallback(
    (value: number | bigint, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(LOCALE_TAGS[locale], options).format(value),
    [locale]
  )

  const formatRelativeTime = useCallback(
    (value: Date | number, now: number = Date.now()) => {
      const delta = now - new Date(value).getTime()
      if (delta < MINUTE) return translate("common.justNow", locale)
      if (delta < HOUR) {
        return translate("common.minutesAgo", locale, { count: Math.floor(delta / MINUTE) })
      }
      if (delta < DAY) {
        return translate("common.hoursAgo", locale, { count: Math.floor(delta / HOUR) })
      }
      return translate("common.daysAgo", locale, { count: Math.floor(delta / DAY) })
    },
    [locale]
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t,
      setLocale,
      formatDate,
      formatDateTime,
      formatNumber,
      formatRelativeTime
    }),
    [locale, t, setLocale, formatDate, formatDateTime, formatNumber, formatRelativeTime]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider")
  }
  return ctx
}

/** Detects the best starting locale, ignoring any stored preference. */
export { getPreferredLocale }
export { LOCALES, LOCALE_TAGS } from "./types"
export type { Locale, TranslationKey, TranslationParams } from "./types"
