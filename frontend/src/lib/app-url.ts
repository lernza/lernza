function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export function getCanonicalAppUrl(): string {
  const configured = import.meta.env.VITE_APP_URL?.trim()
  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (typeof window === "undefined") {
    return ""
  }

  const basePath = import.meta.env.BASE_URL || "/"
  const url = new URL(basePath, window.location.origin)
  return trimTrailingSlash(url.toString())
}

export function getQuestUrl(questId: number): string {
  const origin = getCanonicalAppUrl()
  return `${origin}/quest/${questId}`
}
