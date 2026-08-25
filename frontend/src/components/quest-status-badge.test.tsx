import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { QuestStatusBadge } from "./quest-status-badge"

describe("QuestStatusBadge", () => {
  it("renders active quest status", () => {
    render(<QuestStatusBadge status="active" />)
    expect(screen.getByText(/active/i)).toBeInTheDocument()
    expect(screen.getByText(/active/i).closest("span")).toHaveClass("bg-green-100")
  })

  it("renders archived quest status", () => {
    render(<QuestStatusBadge status="archived" />)
    expect(screen.getByText(/archived/i)).toBeInTheDocument()
  })

  it("renders cancelled quest status", () => {
    render(<QuestStatusBadge status="cancelled" />)
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument()
  })

  it("applies correct color classes by status", () => {
    const { rerender } = render(<QuestStatusBadge status="active" />)
    let badge = screen.getByText(/active/i).closest("span")
    expect(badge).toHaveClass("text-green-700")

    rerender(<QuestStatusBadge status="archived" />)
    badge = screen.getByText(/archived/i).closest("span")
    expect(badge).toHaveClass("text-gray-700")
  })
})
