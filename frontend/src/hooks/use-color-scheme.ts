import { useContext } from "react"
import { ThemeContext } from "@/contexts/theme"

export function useColorScheme() {
  return useContext(ThemeContext)
}
