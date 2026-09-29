import { describe, it, expect, vi, beforeEach } from "vitest"
import { logger } from "./logger"

describe("Logger (#1685)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logger.setLevel("info")
  })

  it("logs warn message using structured logger formatting", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("[Dashboard] No quests loaded from any source", { count: 0 })

    expect(warnSpy).toHaveBeenCalledWith(
      "[WARN]",
      expect.objectContaining({
        level: "warn",
        message: "[Dashboard] No quests loaded from any source",
        context: { count: 0 },
      })
    )
    warnSpy.mockRestore()
  })

  it("suppresses debug messages when level is info", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    logger.debug("hidden debug message")

    expect(debugSpy).not.toHaveBeenCalled()
    debugSpy.mockRestore()
  })

  it("allows setting log level to error to filter out info and warn", () => {
    logger.setLevel("error")
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("should be suppressed")

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
