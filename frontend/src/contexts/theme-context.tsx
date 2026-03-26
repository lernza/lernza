import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("lernza-theme")
    if (stored === "dark" || stored === "light") return stored
  } catch {
    return "light"
  }
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
    setTheme(t => (t === "light" ? "dark" : "light"))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
