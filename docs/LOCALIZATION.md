# Localization

Lernza uses a lightweight i18n layer built on React Context. Translations live in `frontend/src/i18n/`.

## File Structure

```
frontend/src/i18n/
  index.ts      # Provider, context, and useTranslation hook
  en.ts         # English translations (the default and only locale for now)
  types.ts      # TypeScript types for translation keys and locale
```

## How It Works

1. The `I18nProvider` wraps the app in `App.tsx` and provides the `t()` function via context.
2. Components call `const { t } = useTranslation()` to access translated strings.
3. The locale is persisted in `localStorage` under the key `lernza-locale`.

## Using Translations in Components

```tsx
import { useTranslation } from "@/i18n"

function MyComponent() {
  const { t } = useTranslation()
  return <p>{t("nav.home")}</p>
}
```

## Adding New Strings

1. Open `frontend/src/i18n/en.ts`.
2. Add a new key-value pair using dot notation for namespacing:

```ts
export const translations = {
  "nav.home": "Home",
  "myFeature.newKey": "New translated string",
} as const
```

3. The `TranslationKey` type is derived automatically from the keys in `en.ts`, so TypeScript will catch missing keys.

## Adding a New Locale

1. Create a new file in `frontend/src/i18n/`, e.g. `es.ts`:

```ts
export const translations = {
  "nav.home": "Inicio",
  // ...
} as const
```

2. Add the locale to the `Locale` type in `types.ts`.
3. Update the `I18nProvider` to load the appropriate translation file based on the active locale.

## Key Naming Convention

- Use dot-separated namespaces: `"section.component"`
- Examples: `"nav.home"`, `"quest.reportQuest"`, `"dashboard.title"`
- Keep keys short but descriptive.
