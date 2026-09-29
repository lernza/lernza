import type { KeyboardEvent } from "react"

/**
 * Shared keyboard navigation for quest-card groups — issue #1625.
 *
 * Quest cards are native `<button>`s so Tab / Enter / Space work for free.
 * This helper adds the missing piece: arrow-key movement within a card group
 * (roving focus between `[data-quest-card]` siblings), plus Home / End jumps.
 *
 * Usage:
 * ```tsx
 * <div role="list" aria-label="..." onKeyDown={handleQuestCardGridKeyDown}>
 *   <button data-quest-card tabIndex={0} ... />
 * </div>
 * ```
 */
export function handleQuestCardGridKeyDown(event: KeyboardEvent<HTMLElement>): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  const card = target.closest("[data-quest-card]") as HTMLElement | null
  if (!card) return

  const container = card.closest("[data-quest-card-group]") as HTMLElement | null
  const scope = container ?? card.parentElement
  if (!scope) return

  const cards = Array.from(
    scope.querySelectorAll<HTMLElement>("[data-quest-card]")
  ).filter(el => !el.hasAttribute("disabled"))
  if (cards.length < 2) return

  const index = cards.indexOf(card)
  if (index === -1) return

  let nextIndex: number | null = null

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      nextIndex = (index + 1) % cards.length
      break
    case "ArrowLeft":
    case "ArrowUp":
      nextIndex = (index - 1 + cards.length) % cards.length
      break
    case "Home":
      nextIndex = 0
      break
    case "End":
      nextIndex = cards.length - 1
      break
    default:
      return
  }

  event.preventDefault()
  cards[nextIndex]?.focus()
}

/**
 * Key handler for a single quest card button.
 *
 * Native `<button>` activation (Enter / Space → onClick) needs no manual
 * handling. This handler only moves focus with the arrow keys so an
 * individual card stays navigable even when rendered outside a
 * `[data-quest-card-group]` container.
 */
export function handleQuestCardKeyDown(event: KeyboardEvent<HTMLElement>): void {
  handleQuestCardGridKeyDown(event)
}
