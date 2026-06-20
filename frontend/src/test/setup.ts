import "@testing-library/jest-dom/vitest"
import { expect, vi } from "vitest"
import * as axeMatchers from "vitest-axe/matchers"
import "vitest-axe/extend-expect"

expect.extend(axeMatchers)

// jsdom does not implement IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
