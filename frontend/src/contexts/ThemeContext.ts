import { createContext, useContext } from "react"

export type Theme = "light" | "dark"

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
})

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
