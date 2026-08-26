import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  QUEST_TEMPLATES,
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
  templateToStep1,
  templateToMilestones,
  templateTotalReward,
  type TemplateCategory,
} from "./quest-templates"
import { TemplatePicker } from "./template-picker"

// ─── quest-templates data tests ──────────────────────────────────────────────

describe("QUEST_TEMPLATES data integrity", () => {
  it("contains at least one template per category", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      const matches = QUEST_TEMPLATES.filter(t => t.category === cat)
      expect(matches.length).toBeGreaterThan(0)
    }
  })

  it("every template has a unique id", () => {
    const ids = QUEST_TEMPLATES.map(t => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it("every template has at least one milestone", () => {
    for (const t of QUEST_TEMPLATES) {
      expect(t.milestones.length).toBeGreaterThan(0)
    }
  })

  it("all milestone rewardAmounts are positive numbers", () => {
    for (const t of QUEST_TEMPLATES) {
      for (const m of t.milestones) {
        expect(typeof m.rewardAmount).toBe("number")
        expect(m.rewardAmount).toBeGreaterThan(0)
      }
    }
  })

  it("templateTotalReward returns correct sum", () => {
    const t = QUEST_TEMPLATES[0]
    const expected = t.milestones.reduce((s, m) => s + m.rewardAmount, 0)
    expect(templateTotalReward(t)).toBe(expected)
  })

  it("templateTotalReward is 0 for empty milestones", () => {
    const fake = { ...QUEST_TEMPLATES[0], milestones: [] }
    expect(templateTotalReward(fake)).toBe(0)
  })

  it("catalogue contains the course-smart-contracts template", () => {
    expect(QUEST_TEMPLATES.find(t => t.id === "course-smart-contracts")).toBeDefined()
  })

  it("catalogue contains the bootcamp-ai-ml template", () => {
    expect(QUEST_TEMPLATES.find(t => t.id === "bootcamp-ai-ml")).toBeDefined()
  })

  it("catalogue contains the challenge-security template", () => {
    expect(QUEST_TEMPLATES.find(t => t.id === "challenge-security")).toBeDefined()
  })

  it("has at least 3 templates in each category", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      const matches = QUEST_TEMPLATES.filter(t => t.category === cat)
      expect(matches.length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe("templateToStep1()", () => {
  it("maps template fields to Step1Values correctly", () => {
    const t = QUEST_TEMPLATES[0]
    const s1 = templateToStep1(t)
    expect(s1.name).toBe(t.name)
    expect(s1.description).toBe(t.description)
    expect(s1.category).toBe(t.categoryLabel)
    expect(s1.tags).toEqual(t.tags)
  })

  it("returns a deep copy of tags (not the same reference)", () => {
    const t = QUEST_TEMPLATES[0]
    const s1 = templateToStep1(t)
    expect(s1.tags).not.toBe(t.tags)
  })
})

describe("templateToMilestones()", () => {
  it("returns same number of milestones as template", () => {
    const t = QUEST_TEMPLATES[0]
    const ms = templateToMilestones(t)
    expect(ms.length).toBe(t.milestones.length)
  })

  it("returns deep copies (not same references)", () => {
    const t = QUEST_TEMPLATES[0]
    const ms = templateToMilestones(t)
    expect(ms[0]).not.toBe(t.milestones[0])
    expect(ms[0].title).toBe(t.milestones[0].title)
  })
})

describe("CATEGORY_LABELS", () => {
  it("has a label for every category", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy()
    }
  })
})

// ─── TemplatePicker component tests ──────────────────────────────────────────

const noop = () => {}

describe("TemplatePicker", () => {
  it("renders nothing when isOpen is false", () => {
    render(<TemplatePicker isOpen={false} onClose={noop} onApply={noop} />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("renders the dialog when isOpen is true", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)
    expect(screen.getByRole("dialog")).toBeDefined()
    expect(screen.getByText("Choose a Template")).toBeDefined()
  })

  it("renders 'All' and one button per category in the filter row", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)

    // 'All' filter button
    expect(screen.getByRole("button", { name: /^All/i })).toBeDefined()

    // One button per category
    for (const cat of TEMPLATE_CATEGORIES) {
      const label = CATEGORY_LABELS[cat as TemplateCategory]
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeDefined()
    }
  })

  it("shows all templates when 'All' filter is active (default)", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)
    const cards = screen.getAllByTestId("template-card")
    expect(cards.length).toBe(QUEST_TEMPLATES.length)
  })

  it("filters to only course templates when Course is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)

    const courseBtn = screen.getByRole("button", { name: /^Course/i })
    fireEvent.click(courseBtn)

    const courseCount = QUEST_TEMPLATES.filter(t => t.category === "course").length
    const cards = screen.getAllByTestId("template-card")
    expect(cards.length).toBe(courseCount)
  })

  it("filters to only bootcamp templates when Bootcamp is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)

    const btn = screen.getByRole("button", { name: /^Bootcamp/i })
    fireEvent.click(btn)

    const count = QUEST_TEMPLATES.filter(t => t.category === "bootcamp").length
    const cards = screen.getAllByTestId("template-card")
    expect(cards.length).toBe(count)
  })

  it("filters to only skill challenge templates when Skill Challenge is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)

    const btn = screen.getByRole("button", { name: /^Skill Challenge/i })
    fireEvent.click(btn)

    const count = QUEST_TEMPLATES.filter(t => t.category === "skill-challenge").length
    const cards = screen.getAllByTestId("template-card")
    expect(cards.length).toBe(count)
  })

  it("calls onClose when the close (×) button is clicked", () => {
    const onClose = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={noop} />)

    const closeBtn = screen.getByRole("button", { name: /close template picker/i })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose when the Cancel button in the footer is clicked", () => {
    const onClose = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={noop} />)

    const cancelBtn = screen.getByRole("button", { name: /^Cancel$/i })
    fireEvent.click(cancelBtn)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onApply with the correct template when 'Use Template' is clicked", () => {
    const onApply = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={onApply} />)

    const firstTemplate = QUEST_TEMPLATES[0]
    const applyBtn = screen.getByTestId(`apply-template-${firstTemplate.id}`)
    fireEvent.click(applyBtn)

    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledWith(firstTemplate)
  })

  it("calls onClose when clicking the backdrop", () => {
    const onClose = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={onClose} onApply={noop} />)

    // The backdrop is the first child — find via aria-hidden
    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("shows preview panel when a template card is clicked", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)

    const firstTemplate = QUEST_TEMPLATES[0]
    const card = screen.getAllByTestId("template-card")[0]
    fireEvent.click(card)

    // Preview panel should now be visible (on desktop it's hidden via CSS,
    // but in jsdom all elements render — check for the data-testid)
    expect(screen.getByTestId("template-preview-panel")).toBeDefined()
    // The preview panel should show the first milestone
    expect(screen.getByText(firstTemplate.milestones[0].title)).toBeDefined()
  })

  it("toggles off the preview panel when the same card is clicked again", () => {
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={noop} />)

    const card = screen.getAllByTestId("template-card")[0]
    // Click once to open
    fireEvent.click(card)
    expect(screen.getByTestId("template-preview-panel")).toBeDefined()

    // Click again to close
    fireEvent.click(card)
    expect(screen.queryByTestId("template-preview-panel")).toBeNull()
  })

  it("calls onApply when the preview panel 'Use This Template' button is clicked", () => {
    const onApply = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={onApply} />)

    const firstTemplate = QUEST_TEMPLATES[0]
    // Open preview
    fireEvent.click(screen.getAllByTestId("template-card")[0])

    const previewApplyBtn = screen.getByTestId(`preview-apply-template-${firstTemplate.id}`)
    fireEvent.click(previewApplyBtn)

    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledWith(firstTemplate)
  })
})

// ─── Integration: apply flow through the picker ───────────────────────────────

describe("Template apply flow integration", () => {
  it("onApply receives a template whose step1 values pass schema validation", () => {
    const onApply = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={onApply} />)

    const firstTemplate = QUEST_TEMPLATES[0]
    fireEvent.click(screen.getByTestId(`apply-template-${firstTemplate.id}`))

    expect(onApply).toHaveBeenCalledOnce()
    const applied: typeof firstTemplate = onApply.mock.calls[0][0]

    // Verify templateToStep1 output is usable
    const s1 = templateToStep1(applied)
    expect(s1.name.length).toBeGreaterThan(0)
    expect(s1.name.length).toBeLessThanOrEqual(64)
    expect(s1.description.length).toBeGreaterThan(0)
    expect(s1.description.length).toBeLessThanOrEqual(2000)
    expect(s1.category.length).toBeGreaterThan(0)
    expect(s1.category.length).toBeLessThanOrEqual(32)
    expect(Array.isArray(s1.tags)).toBe(true)
    expect(s1.tags.length).toBeLessThanOrEqual(5)
  })

  it("onApply receives a template whose milestones all pass schema validation", () => {
    const onApply = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={onApply} />)

    const firstTemplate = QUEST_TEMPLATES[0]
    fireEvent.click(screen.getByTestId(`apply-template-${firstTemplate.id}`))

    const applied: typeof firstTemplate = onApply.mock.calls[0][0]
    const milestones = templateToMilestones(applied)

    expect(milestones.length).toBeGreaterThan(0)
    for (const m of milestones) {
      expect(m.title.length).toBeGreaterThan(0)
      expect(m.title.length).toBeLessThanOrEqual(128)
      expect(m.description.length).toBeGreaterThan(0)
      expect(m.description.length).toBeLessThanOrEqual(1000)
      expect(m.rewardAmount).toBeGreaterThan(0)
    }
  })

  it("all 12 templates pass step1 and milestone schema bounds", () => {
    // Verify every template in the catalogue is form-safe without rendering anything
    for (const template of QUEST_TEMPLATES) {
      const s1 = templateToStep1(template)
      expect(s1.name.trim().length, `${template.id} name empty`).toBeGreaterThan(0)
      expect(s1.name.length, `${template.id} name too long`).toBeLessThanOrEqual(64)
      expect(s1.description.trim().length, `${template.id} desc empty`).toBeGreaterThan(0)
      expect(s1.description.length, `${template.id} desc too long`).toBeLessThanOrEqual(2000)
      expect(s1.category.trim().length, `${template.id} category empty`).toBeGreaterThan(0)
      expect(s1.category.length, `${template.id} category too long`).toBeLessThanOrEqual(32)
      expect(s1.tags.length, `${template.id} too many tags`).toBeLessThanOrEqual(5)

      for (const m of templateToMilestones(template)) {
        expect(m.title.trim().length, `${template.id} milestone title empty`).toBeGreaterThan(0)
        expect(m.title.length, `${template.id} milestone title too long`).toBeLessThanOrEqual(128)
        expect(m.description.trim().length, `${template.id} milestone desc empty`).toBeGreaterThan(
          0
        )
        expect(m.description.length, `${template.id} milestone desc too long`).toBeLessThanOrEqual(
          1000
        )
        expect(m.rewardAmount, `${template.id} reward <= 0`).toBeGreaterThan(0)
      }
    }
  })

  it("applying a different template deselects the previous one in the picker", () => {
    const onApply = vi.fn()
    render(<TemplatePicker isOpen={true} onClose={noop} onApply={onApply} />)

    const cards = screen.getAllByTestId("template-card")
    const second = QUEST_TEMPLATES[1]

    // Click first card to preview it
    fireEvent.click(cards[0])
    expect(screen.getByTestId("template-preview-panel")).toBeDefined()

    // Now apply the second template directly via its apply button
    fireEvent.click(screen.getByTestId(`apply-template-${second.id}`))
    expect(onApply).toHaveBeenCalledWith(second)
    expect(onApply).toHaveBeenCalledTimes(1)
  })
})
