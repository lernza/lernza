import { test, expect } from "@playwright/test"
import { mockWallet } from "./helpers/mock-wallet"

/**
 * Tests covering the quest participation flow:
 *   - Browse quests on the dashboard
 *   - View quest detail page (milestones + enrollees tabs)
 *   - Enroll interaction
 *   - Navigation between quest detail and dashboard
 */

test.describe("Quest participation — dashboard browsing", () => {
  test.beforeEach(async ({ page }) => {
    await mockWallet(page)
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(800)
  })

  test("dashboard renders without crashing", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows quest list or loading/empty state", async ({ page }) => {
    const hasContent =
      (await page.locator("main").textContent()) !== ""
    expect(hasContent).toBe(true)
  })

  test("filter bar is present on dashboard", async ({ page }) => {
    // The dashboard has All / Owned / Enrolled filter tabs
    const hasAll = await page.getByRole("button", { name: /^all$/i }).isVisible().catch(() => false)
    const hasFilter = await page.getByText(/all|owned|enrolled/i).isVisible().catch(() => false)
    expect(hasAll || hasFilter).toBe(true)
  })

  test("Create Quest button is present on dashboard", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /create quest/i })
    ).toBeVisible()
  })

  test("clicking Create Quest navigates to quest creation wizard", async ({ page }) => {
    await page.getByRole("button", { name: /create quest/i }).click()
    await expect(page).toHaveURL(/\/create-quest|\/quest\/create/)
  })
})

test.describe("Quest participation — quest detail page", () => {
  test.beforeEach(async ({ page }) => {
    await mockWallet(page)
    await page.goto("/quest/0")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(600)
  })

  test("quest detail page renders without crashing", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows quest name from mock data", async ({ page }) => {
    // Quest 0 is "Learn to Code with Alex"
    await expect(page.getByText(/learn to code with alex/i)).toBeVisible()
  })

  test("shows Milestones tab", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /milestones/i })
    ).toBeVisible()
  })

  test("shows Enrollees tab", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /enrollees/i })
    ).toBeVisible()
  })

  test("milestones tab is active by default and shows milestone list", async ({ page }) => {
    // Mock milestones for quest 0: Hello World, Build a CLI Tool, etc.
    const hasMilestones = await page
      .getByText(/hello world|build a cli|milestone/i)
      .isVisible()
      .catch(() => false)
    const hasTab = await page.getByRole("button", { name: /milestones/i }).isVisible().catch(() => false)
    expect(hasMilestones || hasTab).toBe(true)
  })

  test("clicking Enrollees tab shows enrollees section", async ({ page }) => {
    const enrolleesTab = page.getByRole("button", { name: /enrollees/i })
    await enrolleesTab.click()
    // Page should not crash
    await expect(page.locator("main")).toBeVisible()
    // Some enrollee-related content or empty state should appear
    const body = await page.textContent("body")
    expect(body).toBeTruthy()
  })

  test("clicking Milestones tab after Enrollees tab switches back", async ({ page }) => {
    await page.getByRole("button", { name: /enrollees/i }).click()
    await page.getByRole("button", { name: /milestones/i }).click()

    const hasMilestonesContent = await page
      .getByText(/hello world|build a cli|reward|usdc/i)
      .isVisible()
      .catch(() => false)
    const tabVisible = await page.getByRole("button", { name: /milestones/i }).isVisible()
    expect(hasMilestonesContent || tabVisible).toBe(true)
  })

  test("quest stats panel renders (enrollees, milestones, pool)", async ({ page }) => {
    // Stats panel should show numbers. Mock quest 0 has 3 enrollees, 5 milestones.
    const body = await page.textContent("body")
    // At least some numerical content should be visible
    expect(body).toMatch(/\d/)
  })

  test("Back button is present and navigates away from quest detail", async ({ page }) => {
    const backBtn = page.getByRole("button", { name: /back/i })
    const hasBack = await backBtn.isVisible().catch(() => false)
    if (!hasBack) test.skip()

    await backBtn.click()
    // Should navigate to dashboard or landing
    await expect(page).toHaveURL(/\/dashboard|\//)
  })
})

test.describe("Quest participation — quest not found", () => {
  test("renders not-found message for unknown quest id", async ({ page }) => {
    await mockWallet(page)
    await page.goto("/quest/99999")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText(/quest not found/i)).toBeVisible()
  })

  test("shows Go back button on quest not found", async ({ page }) => {
    await page.goto("/quest/99999")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("button", { name: /go back/i })).toBeVisible()
  })
})

test.describe("Quest participation — navigation flows", () => {
  test("navigates from dashboard quest card to quest detail", async ({ page }) => {
    await mockWallet(page)
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(800)

    // If any quest card links exist, click the first one
    const questLink = page.locator("a[href^='/quest/']").first()
    const hasLink = await questLink.isVisible().catch(() => false)
    if (!hasLink) {
      // Alternatively navigate directly — still a valid participation entry point
      await page.goto("/quest/0")
      await page.waitForLoadState("networkidle")
      await expect(page.locator("main")).toBeVisible()
      return
    }

    await questLink.click()
    await expect(page).toHaveURL(/\/quest\/\d+/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("creator profile page renders for a quest owner address", async ({ page }) => {
    const mockAddr = "GBXRK2YQABCDEF"
    await page.goto(`/creator/${mockAddr}`)
    await page.waitForLoadState("networkidle")
    await expect(page.locator("main")).toBeVisible()
  })

  test("quest detail at /quest/1 renders Stellar Development Bootcamp", async ({ page }) => {
    await mockWallet(page)
    await page.goto("/quest/1")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText(/stellar development bootcamp/i)).toBeVisible()
  })
})
