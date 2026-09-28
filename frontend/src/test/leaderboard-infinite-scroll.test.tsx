import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import userEvent from "@testing-library/user-event"
import { Leaderboard, clearEarningsCache } from "@/pages/leaderboard"
import { questClient } from "@/lib/contracts/quest"
import { rewardsClient } from "@/lib/contracts/rewards"

/**
 * Issue #1730 — infinite scroll stopped working after a tab switch.
 *
 * The original bug: both tabs' sentinel divs shared one `ref={observerTarget}`,
 * so after a switch the IntersectionObserver was left watching a detached
 * element (or the wrong tab's sentinel). The observer is now driven by
 * `VirtualList`'s `onEndReached` instead of a shared observer ref, and each
 * tab renders its own `VirtualList`, so there is no shared observer to detach.
 *
 * These tests pin the behaviour that actually matters: reaching the end of the
 * list appends a page, and it keeps working after switching tabs in both
 * directions.
 */

vi.mock("@/lib/contracts/quest", () => ({
  questClient: {
    listPublicQuests: vi.fn(),
    getEnrollees: vi.fn(),
  },
}))

vi.mock("@/lib/contracts/rewards", () => ({
  rewardsClient: {
    getUserEarnings: vi.fn(),
  },
}))

/**
 * jsdom has no layout, so the real `VirtualList` (backed by
 * `@tanstack/react-virtual`) never reports its tail as reached and
 * `onEndReached` would never fire. Replace it with a stand-in that renders every
 * item and reports the end on mount, which is the contract the page relies on.
 *
 * Mocking the component rather than the virtualizer keeps the page's own
 * per-tab wiring under test, which is where the #1730 bug lived.
 */
vi.mock("@/components/ui/virtual-list", () => ({
  VirtualList: ({
    items,
    onEndReached,
    renderItem,
    getKey,
    "aria-label": ariaLabel,
  }: {
    items: unknown[]
    onEndReached?: () => void
    renderItem?: (item: unknown) => React.ReactNode
    getKey?: (item: unknown, index: number) => string
    "aria-label"?: string
  }) => {
    const firedFor = React.useRef(0)
    React.useEffect(() => {
      if (items.length > 0 && items.length !== firedFor.current) {
        firedFor.current = items.length
        onEndReached?.()
      }
    }, [items.length, onEndReached])

    return (
      <div role="list" aria-label={ariaLabel}>
        {items.map((item, i) => (
          <div key={getKey ? getKey(item, i) : String(i)}>
            {renderItem ? renderItem(item) : null}
          </div>
        ))}
      </div>
    )
  },
}))

const listPublicQuests = vi.mocked(questClient.listPublicQuests)
const getEnrollees = vi.mocked(questClient.getEnrollees)
const getUserEarnings = vi.mocked(rewardsClient.getUserEarnings)

const ADDR_A = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
const ADDR_B = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
const ADDR_C = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"

function renderLeaderboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Leaderboard />
    </QueryClientProvider>
  )
}

describe("Leaderboard infinite scroll after tab switches (issue #1730)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEarningsCache()

    // Two pages, with page 2 carrying a distinct quest name. That name is what
    // lets a test tell "the quests list paginated" apart from "the earners list
    // paginated", since both paths call `listPublicQuests`.
    listPublicQuests.mockImplementation(async (offset: number) =>
      offset === 0
        ? [
            { id: 1, name: "First Quest" },
            { id: 2, name: "Second Quest" },
          ]
        : [{ id: 90, name: "Page Two Quest" }]
    )
    getEnrollees.mockImplementation(async (id: number) => {
      if (id === 1) return [ADDR_A]
      if (id === 2) return [ADDR_A, ADDR_B]
      return [ADDR_C]
    })
    getUserEarnings.mockImplementation(async (address: string) => {
      if (address === ADDR_A) return 100n
      if (address === ADDR_B) return 50n
      return 10n
    })
  })

  it("appends the next page when the end of the earners list is reached", async () => {
    renderLeaderboard()

    await waitFor(() => expect(getUserEarnings).toHaveBeenCalledWith(ADDR_A))

    // The tail was reached, so a second page was requested.
    await waitFor(() => expect(listPublicQuests).toHaveBeenCalledWith(50, expect.any(Number)))
  })

  it("keeps paging the correct tab after switching earners -> quests -> earners", async () => {
    const user = userEvent.setup()
    renderLeaderboard()

    // Let the earners list page once so the baseline is settled.
    await waitFor(() => expect(getUserEarnings).toHaveBeenCalledWith(ADDR_C))
    const earningsAfterEarnersPaged = getUserEarnings.mock.calls.length

    // Switch to the quests tab. Its own list must paginate...
    await user.click(screen.getByRole("tab", { name: /view active quests/i }))
    await waitFor(() => expect(screen.getByText("Page Two Quest")).toBeInTheDocument())

    // ...and it must NOT have paged the earners list. Only `fetchTopEarners`
    // reads earnings, so any extra call here means the wrong loader ran for
    // the newly mounted tab -- the #1730 failure mode.
    expect(getUserEarnings).toHaveBeenCalledTimes(earningsAfterEarnersPaged)

    // Switching back must resume pagination. Asserted on the page request
    // rather than on earnings: the page caches earnings for 60s, so a repeat
    // lookup is served from cache and would not reach the client again.
    const pageRequestsBefore = () =>
      listPublicQuests.mock.calls.filter(([offset]) => (offset as number) > 0).length

    const beforeReturn = pageRequestsBefore()
    await user.click(screen.getByRole("tab", { name: /view top earners/i }))
    await waitFor(() => expect(pageRequestsBefore()).toBeGreaterThan(beforeReturn))
  })

  it("only pages the active tab's data", async () => {
    const user = userEvent.setup()
    renderLeaderboard()

    await waitFor(() => expect(getUserEarnings).toHaveBeenCalled())
    const before = listPublicQuests.mock.calls.length

    // On the earners tab, the quests view is not rendered at all, so it must
    // not be fetching.
    expect(screen.queryByText("First Quest")).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: /view active quests/i }))
    await waitFor(() => expect(screen.getByText("First Quest")).toBeInTheDocument())

    // Both tabs draw from the same fetcher, so assert the switch actually moved
    // the request onward rather than double-counting.
    expect(listPublicQuests.mock.calls.length).toBeGreaterThan(before)
  })
})
