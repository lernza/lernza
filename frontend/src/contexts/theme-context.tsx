import { useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import { ThemeContext, type Theme } from "./theme"

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"

  try {
    const stored = localStorage.getItem("lernza-theme") ?? localStorage.getItem("theme")
    if (stored === "dark" || stored === "light") return stored
  } catch {
    // Ignore localStorage errors
  }

  // Respect system preference if no explicit user choice saved
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark"

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
      localStorage.setItem("lernza-theme", theme)
    } catch {
      // localStorage unavailable (sandboxed iframe, private mode quota) - ignore
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t: Theme) => (t === "light" ? "dark" : "light"))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
