import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { step1Schema, step2Schema } from "./types"
import {
  QUEST_TEMPLATES,
  TEMPLATES_BY_CATEGORY,
  CATEGORY_META,
  getTemplateById,
  type TemplateCategory,
} from "./quest-templates"
import { TemplatePicker } from "./template-picker"

// ─── Template data integrity ──────────────────────────────────────────────────

describe("Quest templates — data integrity", () => {
  it("has exactly 9 templates", () => {
    expect(QUEST_TEMPLATES).toHaveLength(9)
  })

  it("has 3 templates per category", () => {
    const cats: TemplateCategory[] = ["course", "bootcamp", "challenge"]
    for (const cat of cats) {
      expect(TEMPLATES_BY_CATEGORY[cat]).toHaveLength(3)
    }
  })

  it("all template ids are unique", () => {
    const ids = QUEST_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("all templates belong to a valid category", () => {
    const validCategories: TemplateCategory[] = ["course", "bootcamp", "challenge"]
    for (const t of QUEST_TEMPLATES) {
      expect(validCategories).toContain(t.category)
    }
  })

  it("all templates have non-empty name, tagline, icon, and duration", () => {
    for (const t of QUEST_TEMPLATES) {
      expect(t.name.trim().length).toBeGreaterThan(0)
      expect(t.tagline.trim().length).toBeGreaterThan(0)
      expect(t.icon.trim().length).toBeGreaterThan(0)
      expect(t.duration.trim().length).toBeGreaterThan(0)
    }
  })

  it("getTemplateById returns the right template", () => {
    const first = QUEST_TEMPLATES[0]
    expect(getTemplateById(first.id)).toEqual(first)
  })

  it("getTemplateById returns undefined for unknown id", () => {
    expect(getTemplateById("does-not-exist")).toBeUndefined()
  })

  it("CATEGORY_META has entries for all three categories", () => {
    const cats: TemplateCategory[] = ["course", "bootcamp", "challenge"]
    for (const cat of cats) {
      const meta = CATEGORY_META[cat]
      expect(meta.label.trim().length).toBeGreaterThan(0)
      expect(meta.description.trim().length).toBeGreaterThan(0)
      expect(meta.icon.trim().length).toBeGreaterThan(0)
    }
  })
})

// ─── Schema compliance ────────────────────────────────────────────────────────

describe("Quest templates — step1 schema compliance", () => {
  it.each(QUEST_TEMPLATES)("$name: step1 data passes the step1 schema", template => {
    const result = step1Schema.safeParse(template.step1)
    expect(result.success).toBe(true)
  })

  it.each(QUEST_TEMPLATES)("$name: name ≤ 64 chars and non-blank", template => {
    expect(template.step1.name.length).toBeLessThanOrEqual(64)
    expect(template.step1.name.trim().length).toBeGreaterThan(0)
  })

  it.each(QUEST_TEMPLATES)("$name: description ≤ 2000 chars and non-blank", template => {
    expect(template.step1.description.length).toBeLessThanOrEqual(2000)
    expect(template.step1.description.trim().length).toBeGreaterThan(0)
  })

  it.each(QUEST_TEMPLATES)("$name: category ≤ 32 chars and non-blank", template => {
    expect(template.step1.category.length).toBeLessThanOrEqual(32)
    expect(template.step1.category.trim().length).toBeGreaterThan(0)
  })

  it.each(QUEST_TEMPLATES)("$name: tags count ≤ 5, each ≤ 32 chars", template => {
    expect(template.step1.tags.length).toBeLessThanOrEqual(5)
    for (const tag of template.step1.tags) {
      expect(tag.length).toBeLessThanOrEqual(32)
      expect(tag.trim().length).toBeGreaterThan(0)
    }
  })
})

describe("Quest templates — step2 schema compliance", () => {
  it.each(QUEST_TEMPLATES)("$name: step2 data passes the step2 schema", template => {
    const result = step2Schema.safeParse(template.step2)
    expect(result.success).toBe(true)
  })

  it.each(QUEST_TEMPLATES)("$name: has at least 1 milestone, at most 50", template => {
    const count = template.step2.milestones.length
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })

  it.each(QUEST_TEMPLATES)("$name: all milestone titles ≤ 128 chars and non-blank", template => {
    for (const m of template.step2.milestones) {
      expect(m.title.length).toBeLessThanOrEqual(128)
      expect(m.title.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(QUEST_TEMPLATES)(
    "$name: all milestone descriptions ≤ 1000 chars and non-blank",
    template => {
      for (const m of template.step2.milestones) {
        expect(m.description.length).toBeLessThanOrEqual(1000)
        expect(m.description.trim().length).toBeGreaterThan(0)
      }
    }
  )

  it.each(QUEST_TEMPLATES)("$name: all reward amounts are positive numbers", template => {
    for (const m of template.step2.milestones) {
      expect(m.rewardAmount).toBeGreaterThan(0)
      expect(Number.isFinite(m.rewardAmount)).toBe(true)
    }
  })
})

// ─── TemplatePicker component ─────────────────────────────────────────────────

describe("TemplatePicker component", () => {
  const onClose = vi.fn()
  const onApply = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    onApply.mockClear()
  })

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <TemplatePicker isOpen={false} onClose={onClose} onApply={onApply} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders the modal when isOpen is true", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    expect(screen.getByRole("dialog")).toBeDefined()
    expect(screen.getByText("Choose a Quest Template")).toBeDefined()
  })

  it("renders three category tabs", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    expect(screen.getByRole("tab", { name: /courses/i })).toBeDefined()
    expect(screen.getByRole("tab", { name: /bootcamps/i })).toBeDefined()
    expect(screen.getByRole("tab", { name: /challenges/i })).toBeDefined()
  })

  it("shows courses tab selected by default", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    const coursesTab = screen.getByRole("tab", { name: /courses/i })
    expect(coursesTab.getAttribute("aria-selected")).toBe("true")
  })

  it("shows course template names in the list", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    for (const t of TEMPLATES_BY_CATEGORY.course) {
      // Template name appears in both the card list and the desktop preview panel
      expect(screen.getAllByText(t.name).length).toBeGreaterThanOrEqual(1)
    }
  })

  it("switches to bootcamp category when tab is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    const bootcampTab = screen.getByRole("tab", { name: /bootcamps/i })
    fireEvent.click(bootcampTab)

    // Bootcamp template names should now be visible
    for (const t of TEMPLATES_BY_CATEGORY.bootcamp) {
      expect(screen.getAllByText(t.name).length).toBeGreaterThanOrEqual(1)
    }
    // Course template names should NOT be visible
    for (const t of TEMPLATES_BY_CATEGORY.course) {
      expect(screen.queryByText(t.name)).toBeNull()
    }
  })

  it("switches to challenge category when tab is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    const challengeTab = screen.getByRole("tab", { name: /challenges/i })
    fireEvent.click(challengeTab)
    for (const t of TEMPLATES_BY_CATEGORY.challenge) {
      expect(screen.getAllByText(t.name).length).toBeGreaterThanOrEqual(1)
    }
  })

  it("calls onClose when the close button is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    const closeBtn = screen.getByRole("button", { name: /close template picker/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when Escape is pressed", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onApply with the selected template when the CTA is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    // At least one "Apply Template" button is rendered on desktop layout
    const applyBtns = screen.getAllByText(/apply template/i)
    fireEvent.click(applyBtns[0])
    expect(onApply).toHaveBeenCalledTimes(1)
    // The first argument should be a valid QuestTemplate
    const applied = onApply.mock.calls[0][0]
    expect(applied).toHaveProperty("id")
    expect(applied).toHaveProperty("step1")
    expect(applied).toHaveProperty("step2")
  })

  it("marks the clicked template card as selected (aria-pressed)", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    const secondTemplate = TEMPLATES_BY_CATEGORY.course[1]
    const card = screen.getByRole("button", { name: new RegExp(secondTemplate.name, "i") })
    fireEvent.click(card)
    expect(card.getAttribute("aria-pressed")).toBe("true")
  })

  it("has correct role attributes for accessibility", () => {
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={onApply} />)
    expect(screen.getByRole("dialog")).toBeDefined()
    expect(screen.getByRole("tablist")).toBeDefined()
    const tabs = screen.getAllByRole("tab")
    expect(tabs.length).toBe(3)
  })
})
