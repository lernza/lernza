import { test, expect } from "@playwright/test"

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("loads and renders the hero section", async ({ page }) => {
    await expect(page).toHaveTitle(/Lernza/i)
    // Hero heading contains the brand name or tagline
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeVisible()
  })

  test("renders the navbar with logo", async ({ page }) => {
    const navbar = page.getByRole("navigation")
    await expect(navbar).toBeVisible()
  })

  test("shows navigation button for Leaderboard", async ({ page }) => {
    await expect(page.getByRole("button", { name: /leaderboard/i })).toBeVisible()
  })

  test("has a call-to-action button", async ({ page }) => {
    // Landing page should have at least one primary CTA button
    const cta = page.getByRole("button").first()
    await expect(cta).toBeVisible()
  })

  test("page has no broken layout — main content is visible", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })
})
