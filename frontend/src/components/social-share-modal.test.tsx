import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SocialShareModal } from "./social-share-modal"

const mockConfig = {
  title: "Quest Completed!",
  description: "You have successfully completed the quest",
  questName: "Blockchain Basics",
  achievementText: "I just completed",
  url: "https://example.com/quest/1",
}

describe("SocialShareModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders when open", () => {
    render(
      <SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />,
    )
    expect(screen.getByText("Share Your Achievement")).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    const { container } = render(
      <SocialShareModal isOpen={false} config={mockConfig} onClose={vi.fn()} />,
    )
    const dialog = container.querySelector("dialog")
    expect(dialog).not.toBeVisible()
  })

  it("displays achievement details", () => {
    render(
      <SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />,
    )
    expect(screen.getByText("Quest Completed!")).toBeInTheDocument()
    expect(screen.getByText(/I just completed/)).toBeInTheDocument()
  })

  it("has Twitter share button", () => {
    render(
      <SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />,
    )
    expect(screen.getByRole("button", { name: /share on twitter/i })).toBeInTheDocument()
  })

  it("has Discord share button", () => {
    render(
      <SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />,
    )
    expect(screen.getByRole("button", { name: /copy for discord/i })).toBeInTheDocument()
  })

  it("has copy to clipboard button", () => {
    render(
      <SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />,
    )
    expect(screen.getByRole("button", { name: /copy to clipboard/i })).toBeInTheDocument()
  })

  it("closes modal when close button clicked", () => {
    const onClose = vi.fn()
    render(
      <SocialShareModal isOpen={true} config={mockConfig} onClose={onClose} />,
    )
    fireEvent.click(screen.getByLabelText("Close dialog"))
    expect(onClose).toHaveBeenCalled()
  })

  it("copies to clipboard when copy button clicked", async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    render(
      <SocialShareModal isOpen={true} config={mockConfig} onClose={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole("button", { name: /copy to clipboard/i }))
    expect(mockClipboard.writeText).toHaveBeenCalled()
  })
})
