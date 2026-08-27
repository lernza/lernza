import { render, screen } from "@testing-library/react"
import { axe } from "vitest-axe"
import { describe, expect, it } from "vitest"

import { ReputationBadge } from "./reputation-badge"
import { getTierVariant } from "./reputation-badge.variants"
import { calculateReputation, type ReputationSummary } from "@/lib/reputation"

const NOW = Date.UTC(2025, 0, 1)

function summary(overrides: Partial<ReputationSummary> = {}): ReputationSummary {
  return {
    score: 200,
    tier: "Bronze",
    completionRate: 1,
    averageRating: 4,
    ratingCount: 3,
    interactions: 8,
    confidence: 1,
    ...overrides,
  }
}

describe("ReputationBadge", () => {
  it("renders the tier and score by default", () => {
    render(<ReputationBadge summary={summary({ tier: "Gold", score: 640 })} />)

    expect(screen.getByText("Gold")).toBeInTheDocument()
    expect(screen.getByText("640")).toBeInTheDocument()
  })

  it("hides the numeric score when showScore is false", () => {
    render(<ReputationBadge summary={summary({ tier: "Silver", score: 350 })} showScore={false} />)

    expect(screen.getByText("Silver")).toBeInTheDocument()
    expect(screen.queryByText("350")).not.toBeInTheDocument()
  })

  it("flags low-confidence reputations as provisional", () => {
    render(<ReputationBadge summary={summary({ tier: "Newcomer", score: 60, confidence: 0.25 })} />)

    expect(screen.getByText("Newcomer · provisional")).toBeInTheDocument()
  })

  it("does not flag well-established reputations", () => {
    render(<ReputationBadge summary={summary({ tier: "Platinum", score: 800, confidence: 1 })} />)

    expect(screen.getByText("Platinum")).toBeInTheDocument()
    expect(screen.queryByText(/provisional/)).not.toBeInTheDocument()
  })

  it("exposes an accessible label describing the reputation", () => {
    render(<ReputationBadge summary={summary({ tier: "Gold", score: 640 })} />)

    expect(screen.getByLabelText("Reputation: Gold, score 640 out of 1000")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ReputationBadge summary={summary()} />)

    expect(await axe(container)).toHaveNoViolations()
  })

  it("integrates with a summary produced by calculateReputation", () => {
    const computed = calculateReputation(
      [{ type: "quest_completed", role: "participant", timestamp: NOW }],
      { now: NOW }
    )

    render(<ReputationBadge summary={computed} />)

    expect(screen.getByText(String(computed.score))).toBeInTheDocument()
  })
})

describe("getTierVariant", () => {
  it("maps every tier onto a badge variant", () => {
    expect(getTierVariant("Newcomer")).toBe("outline")
    expect(getTierVariant("Bronze")).toBe("warning")
    expect(getTierVariant("Silver")).toBe("secondary")
    expect(getTierVariant("Gold")).toBe("default")
    expect(getTierVariant("Platinum")).toBe("verified")
  })
})
