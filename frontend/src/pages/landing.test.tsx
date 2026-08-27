import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Landing } from "./landing"

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}))

vi.mock("@/components/PrefetchLink", () => ({
  PrefetchLink: ({ href, children }: any) => (
    <a href={href}>{children}</a>
  ),
}))

import { useWallet } from "@/hooks/use-wallet"

const mockUseWallet = vi.mocked(useWallet)

describe("Landing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWallet.mockReturnValue({
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      address: null,
      shortAddress: null,
      loading: false,
      network: "testnet",
    } as any)
  })

  it("renders landing page title", () => {
    render(<Landing />)
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
  })

  it("renders call-to-action buttons", () => {
    render(<Landing />)
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
  })

  it("shows connect wallet button when not connected", () => {
    render(<Landing />)
    const connectButtons = screen.queryAllByRole("button", { name: /connect/i })
    expect(connectButtons.length).toBeGreaterThan(0)
  })

  it("renders feature sections", () => {
    render(<Landing />)
    expect(screen.getByText(/features|how it works/i)).toBeInTheDocument()
  })

  it("handles wallet connection from landing", () => {
    const mockConnect = vi.fn()
    mockUseWallet.mockReturnValue({
      connected: false,
      connect: mockConnect,
      disconnect: vi.fn(),
      address: null,
      shortAddress: null,
      loading: false,
      network: "testnet",
    } as any)

    render(<Landing />)
    const connectButton = screen.getByRole("button", { name: /connect|wallet/i })
    fireEvent.click(connectButton)
    expect(mockConnect).toHaveBeenCalled()
  })

  it("renders navigation links", () => {
    render(<Landing />)
    const links = screen.getAllByRole("link")
    expect(links.length).toBeGreaterThan(0)
  })
})
