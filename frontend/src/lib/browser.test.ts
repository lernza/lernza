import { describe, it, expect, vi } from "vitest"
import {
  copyTextWithFallback,
  getHistoryLength,
  isBrowserEnvironment,
  openWindowSafely,
  supportsMobileNativeShare,
} from "./browser"

describe("browser helpers", () => {
  it("detects browser environment only when window and document exist", () => {
    expect(isBrowserEnvironment({ windowObj: undefined, documentObj: undefined })).toBe(false)
    expect(
      isBrowserEnvironment({
        windowObj: {} as Window,
        documentObj: {} as Document,
      })
    ).toBe(true)
  })

  it("checks native mobile share support with coarse pointer", () => {
    const env = {
      windowObj: {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      } as unknown as Window,
      navigatorObj: {
        share: vi.fn(),
      } as unknown as Navigator,
    }
    expect(supportsMobileNativeShare(env)).toBe(true)
  })

  it("returns history length safely", () => {
    expect(getHistoryLength()).toBeGreaterThanOrEqual(0)
    expect(
      getHistoryLength({
        windowObj: { history: { length: 7 } } as unknown as Window,
      })
    ).toBe(7)
  })

  it("copies text with clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const result = await copyTextWithFallback("abc", {
      navigatorObj: { clipboard: { writeText } } as unknown as Navigator,
    })
    expect(result).toBe(true)
    expect(writeText).toHaveBeenCalledWith("abc")
  })

  it("falls back to document.execCommand when clipboard write fails", async () => {
    const appendChild = vi.fn()
    const removeChild = vi.fn()
    const textarea = {
      value: "",
      style: {} as CSSStyleDeclaration,
      setAttribute: vi.fn(),
      select: vi.fn(),
    } as unknown as HTMLTextAreaElement

    const result = await copyTextWithFallback("abc", {
      navigatorObj: {
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      } as unknown as Navigator,
      documentObj: {
        createElement: vi.fn().mockReturnValue(textarea),
        execCommand: vi.fn().mockReturnValue(true),
        body: {
          appendChild,
          removeChild,
        },
      } as unknown as Document,
    })

    expect(result).toBe(true)
    expect(appendChild).toHaveBeenCalled()
    expect(removeChild).toHaveBeenCalled()
  })

  it("opens a new window only when open is available", () => {
    expect(
      openWindowSafely("https://example.com", "_blank", "noopener", { windowObj: undefined })
    ).toBe(false)
    const open = vi.fn()
    expect(
      openWindowSafely("https://example.com", "_blank", "noopener", {
        windowObj: { open } as unknown as Window,
      })
    ).toBe(true)
    expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener")
  })
})
