type BrowserLikeWindow = Pick<Window, "matchMedia" | "open" | "history"> & {
  scrollY?: number
  innerWidth?: number
}

type BrowserLikeDocument = Pick<Document, "createElement" | "body" | "activeElement"> & {
  execCommand?: (commandId: string) => boolean
}

type BrowserLikeNavigator = Pick<Navigator, "share"> & {
  clipboard?: { writeText: (text: string) => Promise<void> }
}

interface BrowserEnv {
  windowObj?: BrowserLikeWindow
  documentObj?: BrowserLikeDocument
  navigatorObj?: BrowserLikeNavigator
}

function resolveEnv(env?: BrowserEnv): BrowserEnv {
  const hasWindowOverride = Boolean(env && "windowObj" in env)
  const hasDocumentOverride = Boolean(env && "documentObj" in env)
  const hasNavigatorOverride = Boolean(env && "navigatorObj" in env)

  return {
    windowObj: hasWindowOverride
      ? env?.windowObj
      : typeof window !== "undefined"
        ? window
        : undefined,
    documentObj: hasDocumentOverride
      ? env?.documentObj
      : typeof document !== "undefined"
        ? document
        : undefined,
    navigatorObj: hasNavigatorOverride
      ? env?.navigatorObj
      : typeof navigator !== "undefined"
        ? navigator
        : undefined,
  }
}

export function isBrowserEnvironment(env?: BrowserEnv): boolean {
  const { windowObj, documentObj } = resolveEnv(env)
  return Boolean(windowObj && documentObj)
}

export function getHistoryLength(env?: BrowserEnv): number {
  const { windowObj } = resolveEnv(env)
  return windowObj?.history?.length ?? 0
}

export function supportsMobileNativeShare(env?: BrowserEnv): boolean {
  const { windowObj, navigatorObj } = resolveEnv(env)
  if (!windowObj || !navigatorObj?.share) return false
  return windowObj.matchMedia("(pointer: coarse)").matches
}

export async function copyTextWithFallback(text: string, env?: BrowserEnv): Promise<boolean> {
  const { navigatorObj, documentObj } = resolveEnv(env)

  if (navigatorObj?.clipboard?.writeText) {
    try {
      await navigatorObj.clipboard.writeText(text)
      return true
    } catch {
      // fall through to legacy copy path
    }
  }

  if (!documentObj?.body || !documentObj.createElement || !documentObj.execCommand) {
    return false
  }

  const textarea = documentObj.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  documentObj.body.appendChild(textarea)
  textarea.select()

  let copied = false
  try {
    copied = documentObj.execCommand("copy")
  } catch {
    copied = false
  }
  documentObj.body.removeChild(textarea)
  return copied
}

export function openWindowSafely(
  url: string,
  target = "_blank",
  features = "noopener,noreferrer",
  env?: BrowserEnv
): boolean {
  const { windowObj } = resolveEnv(env)
  if (!windowObj?.open) return false
  windowObj.open(url, target, features)
  return true
}
