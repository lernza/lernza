import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"

/**
 * Windowed list rendering. Only the rows intersecting the viewport (plus a
 * small overscan buffer) are mounted, which keeps long quest/enrollee/
 * leaderboard lists smooth. See issue #1615.
 */

interface VirtualListProps<T> {
  items: T[]
  /** Stable React key for a row. */
  getKey: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactNode
  /** Approximate row height in pixels; measured on first render. */
  estimateSize?: (index: number) => number
  className?: string
  itemClassName?: string
  /** Viewport height. */
  height?: number | string
  overscan?: number
  /** Fired when the tail is reached, for infinite scroll. */
  onEndReached?: () => void
  as?: "ul" | "ol" | "div"
  "aria-label"?: string
}

export function VirtualList<T>({
  items,
  getKey,
  renderItem,
  estimateSize,
  className,
  itemClassName,
  height = 520,
  overscan = 6,
  onEndReached,
  as = "div",
  ...rest
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endReachedRef = useRef(onEndReached)
  endReachedRef.current = onEndReached
  /** Guards against re-requesting the same tail while a page is in flight. */
  const fetchedForLength = useRef(0)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: estimateSize ?? (() => 64),
    overscan,
    getItemKey: index => getKey(items[index] as T, index)
  })

  const virtualRows = virtualizer.getVirtualItems()
  const lastIndex = virtualRows[virtualRows.length - 1]?.index ?? -1

  // Tail detection: as the last virtual row approaches the end of the
  // overscan window, ask the caller for the next page.
  const shouldFetchMore =
    onEndReached !== undefined &&
    items.length > 0 &&
    lastIndex >= items.length - 1 - overscan &&
    lastIndex !== fetchedForLength.current

  useEffect(() => {
    if (!shouldFetchMore) return
    fetchedForLength.current = items.length
    onEndReached?.()
  }, [shouldFetchMore, items.length, onEndReached])

  const ListTag = as

  return (
    <div
      ref={scrollRef}
      style={{ height }}
      className={cn("overflow-y-auto", className)}
    >
      <ListTag
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        {...rest}
      >
        {virtualRows.map(row => {
          const item = items[row.index]
          if (item === undefined) return null
          return (
            <div
              key={row.key}
              ref={virtualizer.measureElement}
              data-index={row.index}
              className={cn("absolute top-0 left-0 w-full", itemClassName)}
              style={{ transform: `translateY(${row.start}px)` }}
            >
              {renderItem(item, row.index)}
            </div>
          )
        })}
      </ListTag>
    </div>
  )
}

/**
 * Imperative handle for scroll-position resets without remounting the list.
 * Exposed as a hook rather than `forwardRef` to keep the generic signature.
 */
export function useVirtualListScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const scrollToTop = useCallback(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [])
  return { ref, scrollToTop }
}
