import { describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useAsyncData } from "./use-async-data"

describe("useAsyncData", () => {
  it("uses the latest fetcher when refetching after a rerender", async () => {
    const firstFetcher = vi.fn().mockResolvedValue("first")
    const secondFetcher = vi.fn().mockResolvedValue("second")

    const { result, rerender } = renderHook(({ fetcher }) => useAsyncData(fetcher), {
      initialProps: { fetcher: firstFetcher },
    })

    await waitFor(() => expect(result.current.data).toBe("first"))

    rerender({ fetcher: secondFetcher })

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(firstFetcher).toHaveBeenCalledOnce()
    expect(secondFetcher).toHaveBeenCalledOnce()
    expect(result.current.data).toBe("second")
  })
})
