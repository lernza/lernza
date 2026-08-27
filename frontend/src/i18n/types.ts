export type TranslationKey = keyof typeof import("./en").translations

export type Locale = "en"

export interface I18nConfig {
  locale: Locale
  fallbackLocale: Locale
}

export interface I18nContextValue {
  locale: Locale
  t: (key: TranslationKey) => string
  setLocale: (locale: Locale) => void
}
