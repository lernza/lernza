import { useEffect, useRef, type RefObject } from "react"

/**
 * Focus management for dialogs and popovers, per WCAG 2.1 SC 2.4.3 (Focus Order)
 * and the WAI-ARIA Authoring Practices dialog pattern.
 *
 * While active this hook:
 *  - moves focus into the container on open (the first focusable descendant by
 *    default, so keyboard users are not stranded on the trigger),
 *  - keeps Tab / Shift+Tab cycling inside the container, pulling focus back in
 *    if it escapes (a backdrop click, or focus landing on <body>),
 *  - closes on Escape via the supplied callback,
 *  - returns focus to whatever was focused before, so dismissing the dialog
 *    leaves the user where they were.
 *
 * The container element must carry `tabIndex={-1}` so it can receive focus
 * programmatically as a fallback when it contains no focusable children.
 */

const FOCUSABLE_SELECTOR = ["a[href]", "button", "input", "select", "textarea", "[tabindex]"].join(
  ", "
)

function isDisabled(element: HTMLElement): boolean {
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    // Deliberately conservative: a disabled <fieldset> disables its
    // descendants, so they are skipped even inside a <legend>.
    element.closest("fieldset[disabled]") !== null
  )
}

function isHidden(element: HTMLElement): boolean {
  if (element.hidden) return true
  if (element.closest("[hidden]")) return true
  if (element.closest('[aria-hidden="true"]')) return true

  // jsdom reports "" for properties it never computes, so only an explicit
  // `none`/`hidden` counts as hidden. This keeps the trap working in tests.
  if (typeof window === "undefined" || !window.getComputedStyle) return false
  const style = window.getComputedStyle(element)
  return style.display === "none" || style.visibility === "hidden"
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(element => {
    if (element.getAttribute("tabindex") === "-1") return false
    return !isDisabled(element) && !isHidden(element)
  })
}

export interface UseFocusTrapOptions {
  /** Whether the trap is engaged. Pass the same value that drives rendering. */
  isActive: boolean
  /** Invoked on Escape. Omit to leave Escape unhandled. */
  onEscape?: () => void
  /** Element to focus on open. Defaults to the first focusable descendant. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Return focus to the trigger on close. Defaults to true. */
  restoreFocus?: boolean
}

export function useFocusTrap<TContainer extends HTMLElement>(
  containerRef: RefObject<TContainer | null>,
  { isActive, onEscape, initialFocusRef, restoreFocus = true }: UseFocusTrapOptions
): void {
  // Held in refs so that callers can pass inline callbacks without re-running
  // the effect (which would re-capture the trigger and steal focus back).
  // This effect is declared before the trap effect so the refs are current
  // by the time the trap engages, and still current when it cleans up.
  const onEscapeRef = useRef(onEscape)
  const initialFocusRefRef = useRef(initialFocusRef)
  const restoreFocusRef = useRef(restoreFocus)

  useEffect(() => {
    onEscapeRef.current = onEscape
    initialFocusRefRef.current = initialFocusRef
    restoreFocusRef.current = restoreFocus
  }, [onEscape, initialFocusRef, restoreFocus])

  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    const container = containerRef.current
    if (!container) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const target =
      initialFocusRefRef.current?.current ?? getFocusableElements(container)[0] ?? container
    target.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const handleEscape = onEscapeRef.current
        if (handleEscape) {
          event.preventDefault()
          handleEscape()
        }
        return
      }

      if (event.key !== "Tab") return

      const focusable = getFocusableElements(container)

      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      // Focus escaped the container (backdrop click, or focus fell to <body>).
      if (!active || !container.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Capture phase on window so the dialog sees the key before the focused
    // control does, and so the trap still works when the event is dispatched
    // directly at window rather than at a node inside the document.
    window.addEventListener("keydown", handleKeyDown, true)

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true)

      const previous = previousFocusRef.current
      if (restoreFocusRef.current && previous && previous.isConnected) {
        previous.focus()
      }
    }
  }, [isActive, containerRef])
}
