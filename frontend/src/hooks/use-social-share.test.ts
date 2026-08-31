import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSocialShare } from "./use-social-share"

const mockConfig = {
  title: "Quest Completed!",
  description: "You have successfully completed the quest",
  questName: "Blockchain Basics",
  achievementText: "I just completed",
  url: "https://example.com/quest/1",
}

describe("useSocialShare", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("initializes with closed modal and no config", () => {
    const { result } = renderHook(() => useSocialShare())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.shareConfig).toBe(null)
  })

  it("opens share modal with config", () => {
    const { result } = renderHook(() => useSocialShare())

    act(() => {
      result.current.openShare(mockConfig)
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.shareConfig).toEqual(mockConfig)
  })

  it("closes share modal", () => {
    const { result } = renderHook(() => useSocialShare())

    act(() => {
      result.current.openShare(mockConfig)
    })

    act(() => {
      result.current.closeShare()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.shareConfig).toBe(null)
  })

  it("generates Twitter share URL", () => {
    const mockWindowOpen = vi.fn()
    window.open = mockWindowOpen

    const { result } = renderHook(() => useSocialShare())

    act(() => {
      result.current.shareOnTwitter(mockConfig)
    })

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("twitter.com"),
      "twitter-share",
      "width=550,height=420",
    )
  })

  it("generates Discord share text", async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const { result } = renderHook(() => useSocialShare())

    act(() => {
      result.current.shareOnDiscord(mockConfig)
    })

    expect(mockClipboard.writeText).toHaveBeenCalled()
  })

  it("copies text to clipboard", async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const { result } = renderHook(() => useSocialShare())

    await act(async () => {
      await result.current.copyToClipboard("test text")
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith("test text")
  })

  it("handles clipboard copy errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("Clipboard failed")),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const { result } = renderHook(() => useSocialShare())

    await act(async () => {
      await result.current.copyToClipboard("test text")
    })

    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
