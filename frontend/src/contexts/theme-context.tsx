import { useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import { ThemeContext, type Theme } from "./theme"

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"

  try {
    const stored = localStorage.getItem("theme")
    if (stored === "dark" || stored === "light") return stored
  } catch {
    // Ignore localStorage errors
  }

  // Default to light; respect the user's explicit choice once they toggle.
  return "light"
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem("theme", theme)
    } catch {
      // localStorage unavailable (sandboxed iframe, private mode quota) - ignore
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t: Theme) => (t === "light" ? "dark" : "light"))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
