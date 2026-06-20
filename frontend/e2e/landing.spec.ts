import { test, expect } from "@playwright/test"

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("loads and renders the hero section", async ({ page }) => {
    await expect(page).toHaveTitle(/Lernza/i)
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeVisible()
  })

  test("renders the navbar with logo", async ({ page }) => {
    const navbar = page.getByRole("navigation")
    await expect(navbar).toBeVisible()
  })

  test("shows navigation button for Leaderboard", async ({ page }) => {
    await expect(page.getByRole("link", { name: /leaderboard/i })).toBeVisible()
  })

  test("page has no broken layout — main content is visible", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("hero has a Launch App CTA button", async ({ page }) => {
    const launchBtn = page.getByRole("button", { name: /launch app/i })
    await expect(launchBtn).toBeVisible()
  })

  test("hero has a How it works button that scrolls to the section", async ({ page }) => {
    const howBtn = page.getByRole("button", { name: /how it works/i })
    await expect(howBtn).toBeVisible()

    await howBtn.click()

    const section = page.locator("#how-it-works")
    await expect(section).toBeVisible()
  })

  test("Connect Wallet button is present in the navbar", async ({ page }) => {
    const connectBtn = page.getByRole("button", { name: /connect wallet/i })
    await expect(connectBtn).toBeVisible()
  })

  test("dark mode toggle switches the colour scheme", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /switch to (dark|light) mode/i })
    await expect(toggle).toBeVisible()

    const html = page.locator("html")
    const before = await html.getAttribute("class")

    await toggle.click()

    const after = await html.getAttribute("class")
    expect(after).not.toBe(before)
  })

  test("feature grid renders the three how-it-works steps", async ({ page }) => {
    const section = page.locator("#how-it-works")
    await expect(section.getByText("Create a Quest")).toBeVisible()
    await expect(section.getByText("Set Milestones")).toBeVisible()
    await expect(section.getByText("Verify & Reward")).toBeVisible()
  })
})
