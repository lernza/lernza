import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { QuestProgressTracker } from "./quest-progress-tracker"

describe("QuestProgressTracker", () => {
  it("renders progress tracking", () => {
    render(<QuestProgressTracker current={50} total={100} />)
    expect(screen.getByText(/50/)).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it("renders completion percentage", () => {
    render(<QuestProgressTracker current={75} total={100} />)
    expect(screen.getByText(/75%|75\//)).toBeInTheDocument()
  })

  it("handles zero progress", () => {
    render(<QuestProgressTracker current={0} total={100} />)
    expect(screen.getByText(/0/)).toBeInTheDocument()
  })

  it("handles completed progress", () => {
    render(<QuestProgressTracker current={100} total={100} />)
    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "100")
  })

  it("displays label when provided", () => {
    render(<QuestProgressTracker current={50} total={100} label="Milestones Completed" />)
    expect(screen.getByText("Milestones Completed")).toBeInTheDocument()
  })
})
