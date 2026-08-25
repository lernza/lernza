import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Navbar } from "./navbar"

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}))

vi.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: vi.fn(),
}))

import { useWallet } from "@/hooks/use-wallet"
import { useColorScheme } from "@/hooks/use-color-scheme"

const mockUseWallet = vi.mocked(useWallet)
const mockUseColorScheme = vi.mocked(useColorScheme)

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWallet.mockReturnValue({
      connected: false,
      shortAddress: null,
      address: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      loading: false,
      network: "testnet",
    } as any)
    mockUseColorScheme.mockReturnValue({
      theme: "light",
      toggleTheme: vi.fn(),
    })
  })

  it("renders logo and brand name", () => {
    const onNavigate = vi.fn()
    render(<Navbar activePage="landing" onNavigate={onNavigate} />)
    expect(screen.getByText("Lernza")).toBeInTheDocument()
  })

  it("calls onNavigate with 'landing' when logo is clicked", () => {
    const onNavigate = vi.fn()
    render(<Navbar activePage="landing" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByLabelText("Go home"))
    expect(onNavigate).toHaveBeenCalledWith("landing")
  })

  it("highlights active page in desktop navigation", () => {
    const onNavigate = vi.fn()
    render(<Navbar activePage="dashboard" onNavigate={onNavigate} />)
    const dashboardButton = screen.getByRole("button", { name: /dashboard/i })
    expect(dashboardButton).toHaveClass("active")
  })

  it("toggles mobile menu when menu button is clicked", () => {
    const onNavigate = vi.fn()
    render(<Navbar activePage="landing" onNavigate={onNavigate} />)
    const menuButton = screen.getByLabelText("Toggle menu")
    fireEvent.click(menuButton)
    expect(screen.getByText("Dashboard")).toBeVisible()
  })

  it("closes mobile menu when navigating", () => {
    const onNavigate = vi.fn()
    render(<Navbar activePage="landing" onNavigate={onNavigate} />)
    const menuButton = screen.getByLabelText("Toggle menu")
    fireEvent.click(menuButton)
    fireEvent.click(screen.getAllByRole("button", { name: /dashboard/i })[1])
    expect(onNavigate).toHaveBeenCalledWith("dashboard")
  })

  it("renders connect button when wallet not connected", () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      shortAddress: null,
      address: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      loading: false,
      network: "testnet",
    } as any)
    render(<Navbar activePage="landing" onNavigate={vi.fn()} />)
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument()
  })

  it("renders disconnect button when wallet connected", () => {
    const mockDisconnect = vi.fn()
    mockUseWallet.mockReturnValue({
      connected: true,
      shortAddress: "GABC...1234",
      address: "GABC1234567890XYZ",
      connect: vi.fn(),
      disconnect: mockDisconnect,
      loading: false,
      network: "testnet",
    } as any)
    render(<Navbar activePage="landing" onNavigate={vi.fn()} />)
    const disconnectButton = screen.getByRole("button", { name: /gabc/i })
    fireEvent.click(disconnectButton)
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it("toggles theme when theme button is clicked", () => {
    const mockToggleTheme = vi.fn()
    mockUseColorScheme.mockReturnValue({
      theme: "light",
      toggleTheme: mockToggleTheme,
    })
    render(<Navbar activePage="landing" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /switch to/i }))
    expect(mockToggleTheme).toHaveBeenCalled()
  })

  it("calls onLaunchTutorial when tutorial button is clicked", () => {
    const onLaunchTutorial = vi.fn()
    render(
      <Navbar activePage="landing" onNavigate={vi.fn()} onLaunchTutorial={onLaunchTutorial} />,
    )
    fireEvent.click(screen.getByRole("button", { name: /tutorial/i }))
    expect(onLaunchTutorial).toHaveBeenCalled()
  })

  it("renders all navigation items", () => {
    render(<Navbar activePage="landing" onNavigate={vi.fn()} />)
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Leaderboard")).toBeInTheDocument()
    expect(screen.getByText("Profile")).toBeInTheDocument()
  })

  it("shows loading state on connect button when loading", () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      shortAddress: null,
      address: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      loading: true,
      network: "testnet",
    } as any)
    render(<Navbar activePage="landing" onNavigate={vi.fn()} />)
    const connectButton = screen.getByRole("button", { name: /connect/i })
    expect(connectButton).toBeDisabled()
  })
})
