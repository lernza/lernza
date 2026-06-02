import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { axe } from "vitest-axe"
import { FormLabel } from "@/components/ui/form-field"

describe("Form Accessibility Regression Tests", () => {
  it("detects missing label-input association", async () => {
    const { container } = render(
      <form>
        <FormLabel>Name</FormLabel>
        <input type="text" />
      </form>
    )

    const results = await axe(container)

    // Should have violations related to labels
    const labelViolations = results.violations.filter(v => v.id === "label")
    expect(labelViolations.length).toBeGreaterThan(0)
  })

  it("passes when label and input are correctly associated", async () => {
    const { container } = render(
      <form>
        <FormLabel htmlFor="name-input">Name</FormLabel>
        <input id="name-input" type="text" />
      </form>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it("detects missing aria-label or label for buttons with only icons", async () => {
    const { container } = render(
      <button type="button">
        <svg aria-hidden="true" />
      </button>
    )

    const results = await axe(container)
    expect(results.violations.some(v => v.id === "button-name")).toBe(true)
  })
})
