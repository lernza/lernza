import { useState, useEffect, useRef } from "react"

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener("change", update)
    return () => mediaQuery.removeEventListener("change", update)
  }, [])

  return prefersReducedMotion
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Stabilize options to avoid re-running the effect
  const threshold = options?.threshold ?? 0.15
  const rootMargin = options?.rootMargin

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      { threshold, rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, prefersReducedMotion])

  return [ref, inView || prefersReducedMotion] as const
}

export function useCountUp(target: number, duration = 1200, active = true) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, active])

  return active ? value : target
}

export function useTypewriter(text: string, speed = 35, active = true) {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    if (!active) return
    setDisplayed("")
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, active])

  return active ? displayed : text
}
