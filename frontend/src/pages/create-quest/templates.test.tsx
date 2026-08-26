import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuestCreationProvider, useQuestCreation } from "./context"
import { TemplateSelector } from "./template-selector"
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

function TemplatePicker() {
  const { applyTemplate, selectedTemplateId } = useQuestCreation()

  return <TemplateSelector selectedTemplateId={selectedTemplateId} onSelect={applyTemplate} />
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

    render(
      <QuestCreationProvider>
        <TemplatePicker />
        <TemplateState />
      </QuestCreationProvider>
    )

    await user.click(screen.getByRole("button", { name: /bootcamp/i }))

    expect(screen.getByRole("status")).toHaveTextContent(
      "bootcamp|Launch Your Skills Bootcamp|4|Set up your environment"
    )
  })
})
