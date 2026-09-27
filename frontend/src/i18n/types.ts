import en from "./locales/en.json"

/**
 * A translation value is either a plain string, or a CLDR-style plural group
 * keyed by category (`zero`/`one`/`two`/`few`/`many`/`other`) or an exact
 * `=N` match. See issue #1616.
 */
export type TranslationValue = string | Record<string, string>

export type TranslationKey = keyof typeof en

export const LOCALES = ["en", "es", "fr"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const FALLBACK_LOCALE: Locale = "en"

/** Human-readable names shown in the language selector, always self-labelled. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
}

/** BCP-47 tags used for `Intl` date/number formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
}

/** Values accepted for `{{token}}` interpolation. */
export type TranslationParams = Record<string, string | number | bigint>

export interface I18nConfig {
  locale: Locale
  fallbackLocale: Locale
}

export interface I18nContextValue {
  locale: Locale
  t: (key: TranslationKey, params?: TranslationParams) => string
  setLocale: (locale: Locale) => void
  /** Formats a timestamp/date using the active locale's calendar rules. */
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (value: Date | number) => string
  formatNumber: (value: number | bigint, options?: Intl.NumberFormatOptions) => string
  /** Compact "time ago" string, e.g. `3m ago`, localised per plural rules. */
  formatRelativeTime: (value: Date | number, now?: number) => string
}
