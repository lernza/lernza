import type { MouseEvent } from "react"

export function navigateToPath(path: string, options: { replace?: boolean } = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  if (options.replace) {
    window.history.replaceState(null, "", normalizedPath)
  } else {
    window.history.pushState(null, "", normalizedPath)
  }

  const event =
    typeof PopStateEvent === "function" ? new PopStateEvent("popstate") : new Event("popstate")
  window.dispatchEvent(event)
  window.scrollTo({ top: 0, behavior: "smooth" })
}

export function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
}
