import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PersonalProgress } from "./personal-progress"

describe("PersonalProgress component (#1675)", () => {
  it("renders standard bigint totalEarned values formatted with USDC", () => {
    const stats = {
      totalEarned: 50000000n, // 5 USDC (7 decimals)
      questsOwned: 2,
      questsEnrolled: 5,
      milestonesCompleted: 3,
    }

    render(<PersonalProgress stats={stats} />)

    expect(screen.getByText("Enrolled")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("Completed")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Owned")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText(/TOKEN|USDC/)).toBeInTheDocument()
  })

  it("safely handles large bigint values near and exceeding Number.MAX_SAFE_INTEGER without precision loss", () => {
    // 9,007,199,254,740,991n with 7 decimals
    const largeAmount = 90071992547409910000000n
    const stats = {
      totalEarned: largeAmount,
      questsOwned: 10,
      questsEnrolled: 20,
      milestonesCompleted: 15,
    }

    render(<PersonalProgress stats={stats} />)

    expect(screen.getByText(/TOKEN|USDC/)).toBeInTheDocument()
    const earningsEl = screen.getByText(/TOKEN|USDC/)
    expect(earningsEl.textContent).toContain("9,007,199,254,740,991")
  })
})
