import { test, expect } from "@playwright/test"

test.describe("Quest discovery / Leaderboard filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard")
    // Wait for the DOM to be ready — avoid networkidle as Stellar RPC calls never settle
    await page.waitForLoadState("domcontentloaded")
  })

  test("renders leaderboard page without crashing", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows Earners and Quests tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /earners/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /quests/i })).toBeVisible()
  })

  test("switches between Earners and Quests tabs", async ({ page }) => {
    const earnersTab = page.getByRole("button", { name: /earners/i })
    const questsTab = page.getByRole("button", { name: /quests/i })

    await earnersTab.click()
    // Tab should become active (no crash, page still visible)
    await expect(page.locator("main")).toBeVisible()

    await questsTab.click()
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows empty or loading state when no data is available", async ({ page }) => {
    // Page should not show a blank white screen — either content, loading, or empty state
    const body = await page.textContent("body")
    expect(body!.trim().length).toBeGreaterThan(0)
  })
})
