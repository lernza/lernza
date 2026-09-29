import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@/i18n"
import { parseCsvMilestones, generateCsvTemplate } from "./csv-parser"
import { CsvImportDialog } from "./csv-import-dialog"
import { MAX_MILESTONES } from "@/lib/contract-types"

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
    expect(template).toContain("milestone_title,description,reward_amount")
    expect(template).toContain("Complete Environment Setup")
  })

  it("parses the snake_case column names from the issue spec", () => {
    const csv = `milestone_title,description,reward_amount
"Milestone 1","First description",50
"Milestone 2","Second description",100`

    const result = parseCsvMilestones(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.milestones).toHaveLength(2)
    expect(result.milestones[0].title).toBe("Milestone 1")
    expect(result.milestones[1].rewardAmount).toBe(100)
  })

  it("rejects negative reward amounts instead of flipping the sign", () => {
    const csv = `milestone_title,description,reward_amount
"Valid","desc",50
"Negative","desc",-10`

    const result = parseCsvMilestones(csv)
    expect(result.milestones).toHaveLength(1)
    expect(result.milestones[0].rewardAmount).toBe(50)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].row).toBe(3)
    expect(result.errors[0].field).toBe("rewardAmount")
    expect(result.errors[0].message).toMatch(/negative/i)
  })

  it("does not mangle thousands separators or currency symbols", () => {
    const csv = `milestone_title,description,reward_amount
"Big","desc","1,000"
"Currency","desc","$250"
"Suffixed","desc","75 USDC"`

    const result = parseCsvMilestones(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.milestones.map(m => m.rewardAmount)).toEqual([1000, 250, 75])
  })

  it("reports non-numeric reward amounts as row errors", () => {
    const csv = `milestone_title,description,reward_amount
"Bad","desc","abc"`

    const result = parseCsvMilestones(csv)
    expect(result.milestones).toHaveLength(0)
    expect(result.errors[0].field).toBe("rewardAmount")
  })

  it("enforces the contract MAX_MILESTONES cap of 50", () => {
    const rows = Array.from({ length: 55 }, (_, i) => `"Milestone ${i + 1}","desc",10`).join("\n")
    const csv = `milestone_title,description,reward_amount\n${rows}`

    const result = parseCsvMilestones(csv)
    expect(result.milestones).toHaveLength(MAX_MILESTONES)
    // The 5 rows past the cap are reported rather than silently dropped.
    expect(result.errors).toHaveLength(5)
    expect(result.errors[0].row).toBe(52)
    expect(result.errors[0].message).toMatch(/50 milestones/)
  })

  it("rejects milestone titles longer than the contract limit of 128", () => {
    const csv = `milestone_title,description,reward_amount
"${"a".repeat(129)}","desc",10`

    const result = parseCsvMilestones(csv)
    expect(result.milestones).toHaveLength(0)
    expect(result.errors[0].field).toBe("title")
    expect(result.errors[0].message).toMatch(/128/)
  })
})

describe("CsvImportDialog Component Tests", () => {
  it("renders drag and drop UI and download template button when open", () => {
    render(<CsvImportDialog isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />)
    render(
      <I18nProvider>
        <CsvImportDialog isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />
      </I18nProvider>
    )

    expect(screen.getByText("Import Milestones from CSV")).toBeDefined()
    expect(screen.getByText("View Template")).toBeDefined()
    expect(screen.getByText("Browse Files")).toBeDefined()
  })

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <CsvImportDialog isOpen={false} onClose={vi.fn()} onImport={vi.fn()} />
      <I18nProvider>
        <CsvImportDialog isOpen={false} onClose={vi.fn()} onImport={vi.fn()} />
      </I18nProvider>
    )

    expect(container.firstChild).toBeNull()
  })
})
