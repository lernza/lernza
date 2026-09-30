import React, { useState } from "react"
import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "vitest-axe"
import { QuestCreationProvider, useQuestCreation } from "./context"
import { I18nProvider } from "@/i18n"
import { Step1Form } from "./step1"
import { Step2Form } from "./step2"

function renderWizard(ui: React.ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>)
}

function csvFile(contents: string, name = "milestones.csv") {
  return new File([contents], name, { type: "text/csv" })
}

/**
 * Renders step 1 alongside a probe that exposes the shared wizard state, so we
 * can assert what the import actually wrote into step 2. Step 2 mounts only
 * once revealed, mirroring how the wizard lazy-loads it after step 1 completes
 * (react-hook-form reads defaultValues at mount).
 */
function Harness() {
  const { step2Data } = useQuestCreation()
  const [showStep2, setShowStep2] = useState(false)
  return (
    <>
      <Step1Form />
      <button type="button" onClick={() => setShowStep2(true)}>
        Show step 2
      </button>
      {showStep2 && <Step2Form />}
      <div data-testid="step2-milestone-count">{step2Data.milestones.length}</div>
      <div data-testid="step2-first-title">{step2Data.milestones[0]?.title ?? ""}</div>
      <div data-testid="step2-has-placeholder">
        {String(
          step2Data.milestones.some(m => m.title.trim() === "" && m.description.trim() === "")
        )}
      </div>
    </>
  )
}

async function runImport(
  user: ReturnType<typeof userEvent.setup>,
  contents: string,
  mode: "append" | "replace" = "append"
) {
  await user.click(screen.getByRole("button", { name: /import milestones from csv/i }))

  const fileInput = screen.getByLabelText(/browse files/i) as HTMLInputElement
  await user.upload(fileInput, csvFile(contents))

  if (mode === "replace") {
    await user.click(screen.getByRole("radio", { name: /replace current milestones/i }))
  }

  await user.click(await screen.findByRole("button", { name: /^import \d+ milestones$/i }))

  // The review dialog is the confirmation step before anything is committed.
  await user.click(await screen.findByRole("button", { name: /add these milestones/i }))
}

async function importCsv(contents: string, mode: "append" | "replace" = "append") {
  const user = userEvent.setup()
  renderWizard(
    <QuestCreationProvider>
      <Harness />
    </QuestCreationProvider>
  )
  await runImport(user, contents, mode)
}

describe("Step 1 CSV import pre-populates Step 2", () => {
  it("exposes an import entry point and a sample template download", () => {
    renderWizard(
      <QuestCreationProvider>
        <Step1Form />
      </QuestCreationProvider>
    )

    expect(screen.getByRole("button", { name: /import milestones from csv/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /download sample csv/i })).toBeDefined()
    expect(screen.getByText(/milestone_title/)).toBeDefined()
  })

  it("writes imported milestones into shared step 2 state", async () => {
    const csv = `milestone_title,description,reward_amount
"Complete Environment Setup","Install tooling",50
"Hello Soroban","Write a contract",100`

    await importCsv(csv)

    await waitFor(() => {
      expect(screen.getByTestId("step2-milestone-count").textContent).toBe("2")
    })
    expect(screen.getByTestId("step2-first-title").textContent).toBe("Complete Environment Setup")
  })

  it("drops the empty placeholder milestone when appending", async () => {
    const csv = `milestone_title,description,reward_amount
"Only Milestone","desc",25`

    await importCsv(csv, "append")

    await waitFor(() => {
      expect(screen.getByTestId("step2-milestone-count").textContent).toBe("1")
    })
    // A blank row surviving the import would fail step 2 schema validation.
    expect(screen.getByTestId("step2-has-placeholder").textContent).toBe("false")
  })

  it("surfaces a validation summary and blocks confirming an all-invalid file", async () => {
    const user = userEvent.setup()
    renderWizard(
      <QuestCreationProvider>
        <Step1Form />
      </QuestCreationProvider>
    )

    await user.click(screen.getByRole("button", { name: /import milestones from csv/i }))
    const fileInput = screen.getByLabelText(/browse files/i) as HTMLInputElement
    await user.upload(
      fileInput,
      csvFile(
        `milestone_title,description,reward_amount
"","blank title",50
"Valid","desc",-5`
      )
    )

    expect(await screen.findByText(/CSV Parsing Errors/i)).toBeDefined()
    expect(screen.getByText(/cannot be negative/i)).toBeDefined()

    // No valid rows means nothing to confirm, so the primary action stays disabled.
    const importButton = screen.getByRole("button", { name: /^import \d+ milestones$/i })
    expect(importButton.hasAttribute("disabled")).toBe(true)
  })

  it("confirms at most MAX_MILESTONES milestones and reports the overflow", async () => {
    const user = userEvent.setup()
    renderWizard(
      <QuestCreationProvider>
        <Harness />
      </QuestCreationProvider>
    )

    const rows = Array.from({ length: 52 }, (_, i) => `"Milestone ${i + 1}","desc",10`).join("\n")

    await user.click(screen.getByRole("button", { name: /import milestones from csv/i }))
    await user.upload(
      screen.getByLabelText(/browse files/i) as HTMLInputElement,
      csvFile(`milestone_title,description,reward_amount\n${rows}`)
    )

    // The parser reports the rows past the contract cap.
    expect(
      (await screen.findAllByText(/Exceeded contract limit of 50 milestones/i)).length
    ).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: /^import \d+ milestones$/i }))
    await user.click(await screen.findByRole("button", { name: /add these milestones/i }))

    await waitFor(() => {
      expect(screen.getByTestId("step2-milestone-count").textContent).toBe("50")
    })
  })

  it("caps an append that would exceed MAX_MILESTONES and says how many were dropped", async () => {
    const user = userEvent.setup()
    renderWizard(
      <QuestCreationProvider>
        <Harness />
      </QuestCreationProvider>
    )

    const makeCsv = (count: number, offset: number) =>
      `milestone_title,description,reward_amount\n` +
      Array.from({ length: count }, (_, i) => `"M${offset + i}","desc",10`).join("\n")

    // 30 + 30 would be 60, so the second append must trim to the 50 cap.
    await runImport(user, makeCsv(30, 0))
    await waitFor(() => {
      expect(screen.getByTestId("step2-milestone-count").textContent).toBe("30")
    })

    await runImport(user, makeCsv(30, 100))

    await waitFor(() => {
      expect(screen.getByTestId("step2-milestone-count").textContent).toBe("50")
    })
    expect(screen.getByRole("status").textContent).toMatch(/10 extra rows were dropped/i)
  })

  it("renders step 2 pre-populated from a step 1 import", async () => {
    const user = userEvent.setup()
    const csv = `milestone_title,description,reward_amount
"Imported One","desc",10
"Imported Two","desc",20`

    await importCsv(csv)

    await waitFor(() => {
      expect(screen.getByTestId("step2-milestone-count").textContent).toBe("2")
    })

    // Step 2 mounts after the import was committed, so it must arrive filled in.
    await user.click(screen.getByRole("button", { name: /show step 2/i }))

    const firstTitle = document.getElementById("milestone-0-title") as HTMLInputElement
    const firstReward = document.getElementById("milestone-0-reward") as HTMLInputElement
    expect(firstTitle.value).toBe("Imported One")
    expect(firstReward.value).toBe("10")
  })

  it("keeps step 1 free of accessibility violations with the import panel present", async () => {
    const { container } = renderWizard(
      <QuestCreationProvider>
        <Step1Form />
      </QuestCreationProvider>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
