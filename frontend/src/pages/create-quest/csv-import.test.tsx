import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { parseCsvMilestones, generateCsvTemplate } from "./csv-parser"
import { CsvImportDialog } from "./csv-import-dialog"

describe("CSV Milestone Parser Unit Tests", () => {
  it("parses valid multi-row CSV text correctly", () => {
    const csv = `title,description,rewardAmount
"Milestone 1","First description",50
"Milestone 2","Second description",100`

    const result = parseCsvMilestones(csv)
    expect(result.errors.length).toBe(0)
    expect(result.milestones.length).toBe(2)
    expect(result.milestones[0]).toEqual({
      title: "Milestone 1",
      description: "First description",
      rewardAmount: 50,
    })
  })

  it("handles quoted fields containing commas", () => {
    const csv = `title,description,rewardAmount
"Title, with comma","Description, with extra, commas",250`

    const result = parseCsvMilestones(csv)
    expect(result.errors.length).toBe(0)
    expect(result.milestones.length).toBe(1)
    expect(result.milestones[0].title).toBe("Title, with comma")
    expect(result.milestones[0].description).toBe("Description, with extra, commas")
    expect(result.milestones[0].rewardAmount).toBe(250)
  })

  it("detects invalid row values and flags row errors", () => {
    const csv = `title,description,rewardAmount
"","Blank title description",50
"Valid Title","Valid desc",0
"Valid Title 2","Valid desc 2",-10`

    const result = parseCsvMilestones(csv)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.milestones.length).toBe(0)
  })

  it("generates sample CSV template string", () => {
    const template = generateCsvTemplate()
    expect(template).toContain("title,description,rewardAmount")
    expect(template).toContain("Complete Environment Setup")
  })
})

describe("CsvImportDialog Component Tests", () => {
  it("renders drag and drop UI and download template button when open", () => {
    render(
      <CsvImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />
    )

    expect(screen.getByText("Import Milestones from CSV")).toBeDefined()
    expect(screen.getByText("Download CSV Template")).toBeDefined()
    expect(screen.getByText("Browse Files")).toBeDefined()
  })

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <CsvImportDialog
        isOpen={false}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})
