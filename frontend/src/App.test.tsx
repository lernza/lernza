/**  
 * Tests that the skip-to-content link is present, reachable by keyboard,  
 * and points to the main content landmark.  
 * Issue: #952  
 */  
import { describe, it, expect, vi } from "vitest"  
import { render, screen } from "@testing-library/react"  
import React from "react"  
  
// ── Minimal stubs ──────────────────────────────────────────────────────────  
  
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }))  
vi.mock("@vercel/speed-insights/react", () => ({ SpeedInsights: () => null }))  
vi.mock("@/components/navbar", () => ({  
  Navbar: () => React.createElement("nav", { "aria-label": "main" }),  
}))  
vi.mock("@/components/toast", () => ({  
  ToastContainer: () => null,  
}))  
vi.mock("@/components/error-boundary", () => ({  
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),  
}))  
vi.mock("@/pages/landing", () => ({ Landing: () => React.createElement("div", null, "Landing") }))  
vi.mock("@/pages/dashboard", () => ({ Dashboard: () => null }))  
vi.mock("@/pages/quest", () => ({ QuestView: () => null }))  
vi.mock("@/pages/profile", () => ({ Profile: () => null }))  
vi.mock("@/pages/not-found", () => ({ NotFound: () => null }))  
vi.mock("@/pages/create-quest", () => ({ CreateQuest: () => null }))  
vi.mock("@/pages/terms", () => ({ TermsOfService: () => null }))  
vi.mock("@/pages/privacy", () => ({ PrivacyPolicy: () => null }))  
vi.mock("@/pages/leaderboard", () => ({ Leaderboard: () => null }))  
vi.mock("@/pages/creator", () => ({ CreatorProfile: () => null }))  
vi.mock("@/hooks/use-toast", () => ({  
  useToast: () => ({ toasts: [], addToast: vi.fn(), removeToast: vi.fn() }),  
}))  
vi.mock("@/lib/notifications", () => ({ subscribeToasts: vi.fn(() => () => {}) }))  
  
import App from "./App"  // CHANGED from "../App"  
  
describe("skip-to-content link (issue #952)", () => {  
  it("renders a skip link with the correct href", () => {  
    render(<App />)  
    const link = screen.getByRole("link", { name: /skip to main content/i })  
    expect(link.getAttribute("href")).toBe("#main-content")  
  })  
  
  it("skip link appears before the navbar in the DOM", () => {  
    const { container } = render(<App />)  
    const all = Array.from(container.querySelectorAll("a[href='#main-content'], nav"))  
    expect(all[0].tagName.toLowerCase()).toBe("a")  
  })  
  
  it("main landmark has id='main-content' for the skip link target", () => {  
    render(<App />)  
    const main = screen.getByRole("main")  
    expect(main.getAttribute("id")).toBe("main-content")  
  })  
  
  it("skip link has z-index utility class above the navbar when focused", () => {  
    render(<App />)  
    const link = screen.getByRole("link", { name: /skip to main content/i })  
    expect(link.className).toContain("z-[9999]")  
  })  
  
  it("skip link is sr-only by default (not visually obtrusive)", () => {  
    render(<App />)  
    const link = screen.getByRole("link", { name: /skip to main content/i })  
    expect(link.className).toContain("sr-only")  
  })  
})
