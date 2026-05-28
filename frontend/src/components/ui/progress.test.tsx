import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Progress } from "./progress"

describe("Progress component ARIA attributes", () => {
  it("renders with correct ARIA attributes and role", () => {
    render(<Progress value={45} max={100} />)

    const progressbar = screen.getByRole("progressbar")

    expect(progressbar).toHaveAttribute("aria-valuenow", "45")
    expect(progressbar).toHaveAttribute("aria-valuemin", "0")
    expect(progressbar).toHaveAttribute("aria-valuemax", "100")
  })

  it("handles different max values correctly", () => {
    render(<Progress value={10} max={20} />)

    const progressbar = screen.getByRole("progressbar")

    expect(progressbar).toHaveAttribute("aria-valuenow", "10")
    expect(progressbar).toHaveAttribute("aria-valuemax", "20")
  })

  it("caps the progress at 100% visually but preserves ARIA values", () => {
    render(<Progress value={150} max={100} />)

    const progressbar = screen.getByRole("progressbar")

    expect(progressbar).toHaveAttribute("aria-valuenow", "150")
    expect(progressbar).toHaveAttribute("aria-valuemax", "100")

    // Check that the inner div has 100% width (capped by pct calculation)
    const innerBar = progressbar.firstChild as HTMLElement
    expect(innerBar.style.width).toBe("100%")
  })
})
