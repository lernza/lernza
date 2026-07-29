import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { axe } from "vitest-axe"
import { step1Schema, milestoneSchema } from "./types"
import { QuestCreationProvider } from "./context"
import { Step1Form } from "./step1"
import { Step2Form } from "./step2"

describe("Quest Creation Validation Schema Tests", () => {
  it("rejects empty or whitespace-only name and description", () => {
    const res = step1Schema.safeParse({
      name: "   ",
      description: "  \n  ",
      category: "Programming",
      tags: [],
    })
    expect(res.success).toBe(false)
  })

  it("validates category length and blank check", () => {
    const emptyCategory = step1Schema.safeParse({
      name: "Valid Name",
      description: "Valid Desc",
      category: "  ",
      tags: [],
    })
    expect(emptyCategory.success).toBe(false)

    const tooLongCategory = step1Schema.safeParse({
      name: "Valid Name",
      description: "Valid Desc",
      category: "a".repeat(33),
      tags: [],
    })
    expect(tooLongCategory.success).toBe(false)
  })

  it("validates tags count and length limit", () => {
    const tooManyTags = step1Schema.safeParse({
      name: "Valid Name",
      description: "Valid Desc",
      category: "Programming",
      tags: ["t1", "t2", "t3", "t4", "t5", "t6"],
    })
    expect(tooManyTags.success).toBe(false)

    const longTag = step1Schema.safeParse({
      name: "Valid Name",
      description: "Valid Desc",
      category: "Programming",
      tags: ["a".repeat(33)],
    })
    expect(longTag.success).toBe(false)
  })

  it("validates milestone title, description, and rewardAmount", () => {
    const invalidReward = milestoneSchema.safeParse({
      title: "Title",
      description: "Desc",
      rewardAmount: 0,
    })
    expect(invalidReward.success).toBe(false)

    const blankTitle = milestoneSchema.safeParse({
      title: "   ",
      description: "Desc",
      rewardAmount: 10,
    })
    expect(blankTitle.success).toBe(false)
  })
})

describe("Step1Form Component Validation and Accessibility", () => {
  it("renders labels associated with inputs via htmlFor and id", () => {
    render(
      <QuestCreationProvider>
        <Step1Form />
      </QuestCreationProvider>
    )

    const nameInput = screen.getByLabelText(/Quest Name/i)
    expect(nameInput).toBeDefined()
    expect(nameInput.getAttribute("id")).toBe("quest-name-input")

    const descInput = screen.getByLabelText(/Description/i)
    expect(descInput).toBeDefined()
    expect(descInput.getAttribute("id")).toBe("quest-description-input")

    const categoryInput = screen.getByLabelText(/Category/i)
    expect(categoryInput).toBeDefined()
    expect(categoryInput.getAttribute("id")).toBe("quest-category-input")
  })

  it("has zero accessibility violations", async () => {
    const { container } = render(
      <QuestCreationProvider>
        <Step1Form />
      </QuestCreationProvider>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe("Step2Form Component Validation and Accessibility", () => {
  it("renders milestone input labels associated with unique IDs", () => {
    render(
      <QuestCreationProvider>
        <Step2Form />
      </QuestCreationProvider>
    )

    const titleInput = screen.getByLabelText(/Title/i)
    expect(titleInput).toBeDefined()
    expect(titleInput.getAttribute("id")).toBe("milestone-0-title")
  })

  it("has zero accessibility violations", async () => {
    const { container } = render(
      <QuestCreationProvider>
        <Step2Form />
      </QuestCreationProvider>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
