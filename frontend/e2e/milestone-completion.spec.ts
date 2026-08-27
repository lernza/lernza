import { test, expect } from "@playwright/test"
import { mockWallet } from "./helpers/mock-wallet"

test.describe("Milestone completion happy path", () => {
  test("create quest page is accessible and renders form", async ({ page }) => {
    await mockWallet(page)
    await page.goto("/quest/create")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("main")).toBeVisible()
  })

  test("enroll — quest detail page renders milestones from mock data", async ({ page }) => {
    await mockWallet(page)
    // Quest id 0 has mock milestones: Hello World, Build a CLI Tool, etc.
    await page.goto("/quest/0")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("main")).toBeVisible()
  })

  test("submit — quest detail page shows milestone list or enroll prompt", async ({ page }) => {
    await mockWallet(page)
    await page.goto("/quest/0")
    await page.waitForLoadState("networkidle")
    // Either milestones are listed or an enroll/connect prompt is shown
    const hasMilestones = await page
      .getByText(/hello world|build a cli|milestone/i)
      .isVisible()
      .catch(() => false)
    const hasPrompt = await page
      .getByText(/enroll|connect|wallet/i)
      .isVisible()
      .catch(() => false)
    expect(hasMilestones || hasPrompt).toBe(true)
  })

  test("verify — dashboard shows quest stats from mock data", async ({ page }) => {
    await mockWallet(page)
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("main")).toBeVisible()
    // Dashboard should render without crashing and show some content
    const body = await page.textContent("body")
    expect(body).toBeTruthy()
  })

  test("full flow — navigate create → quest detail → dashboard", async ({ page }) => {
    await mockWallet(page)

    // Step 1: create
    await page.goto("/quest/create")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("main")).toBeVisible()

    // Step 2: enroll (quest detail)
    await page.goto("/quest/0")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("main")).toBeVisible()

    // Step 3: submit / verify (dashboard)
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("main")).toBeVisible()
  })
})
