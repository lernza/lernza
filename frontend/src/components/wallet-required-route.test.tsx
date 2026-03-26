import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { WalletRequiredRoute } from "./wallet-required-route"

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(),
}))

import { useWallet } from "@/hooks/use-wallet"

const mockUseWallet = vi.mocked(useWallet)

describe("WalletRequiredRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks protected content when the wallet is disconnected", () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      connect: vi.fn(),
      loading: false,
    } as ReturnType<typeof useWallet>)

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <WalletRequiredRoute
          area="Dashboard"
          description="Connect your wallet to access live dashboard data."
        >
          <div>Protected dashboard content</div>
        </WalletRequiredRoute>
      </MemoryRouter>
    )

    expect(screen.getByText("Dashboard requires a wallet")).toBeTruthy()
    expect(screen.getByText("/dashboard")).toBeTruthy()
    expect(screen.queryByText("Protected dashboard content")).toBeNull()
  })
})
