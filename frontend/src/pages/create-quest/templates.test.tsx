import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuestCreationProvider, useQuestCreation } from "./context"
import {
  QUEST_TEMPLATES as NEW_TEMPLATES,
  templateToStep1,
  templateToMilestones,
} from "./quest-templates"
// Legacy simple template catalogue (course / bootcamp / skill-challenge)
import { QUEST_TEMPLATES } from "./templates"

function TemplateState() {
  const { step1Data, step2Data, selectedTemplateId } = useQuestCreation()

  return (
    <output>
      {selectedTemplateId}|{step1Data.name}|{step2Data.milestones.length}|
      {step2Data.milestones[0]?.title}
    </output>
  )
}

function ApplyButton({ templateId }: { templateId: string }) {
  const { applyTemplate } = useQuestCreation()
  const template = NEW_TEMPLATES.find(t => t.id === templateId)!
  return (
    <button type="button" onClick={() => applyTemplate(template)}>
      {template.name}
    </button>
  )
}

describe("Quest templates", () => {
  it("provides course, bootcamp, and skill challenge templates", () => {
    expect(QUEST_TEMPLATES.map(template => template.id)).toEqual([
      "course",
      "bootcamp",
      "skill-challenge",
    ])
    expect(QUEST_TEMPLATES.every(template => template.milestones.length > 0)).toBe(true)
  })

  it("applies a template's quest details and milestones", async () => {
    const user = userEvent.setup()
    // Use the first bootcamp template from the new catalogue
    const bootcampTemplate = NEW_TEMPLATES.find(t => t.category === "bootcamp")!
    const s1 = templateToStep1(bootcampTemplate)
    const milestones = templateToMilestones(bootcampTemplate)

    render(
      <QuestCreationProvider>
        <ApplyButton templateId={bootcampTemplate.id} />
        <TemplateState />
      </QuestCreationProvider>
    )

    await user.click(screen.getByRole("button", { name: new RegExp(bootcampTemplate.name, "i") }))

    expect(screen.getByRole("status")).toHaveTextContent(
      `${bootcampTemplate.id}|${s1.name}|${milestones.length}|${milestones[0].title}`
    )
  })
})
