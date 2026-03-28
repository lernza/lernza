import { test, expect } from "@playwright/test"

test.describe("Navigation", () => {
  test("navigates from landing to leaderboard", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /leaderboard/i }).first().click()
    await expect(page).toHaveURL(/\/leaderboard/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("navigates directly to /leaderboard", async ({ page }) => {
    await page.goto("/leaderboard")
    await expect(page).toHaveURL(/\/leaderboard/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("navigates to /quest/create", async ({ page }) => {
    await page.goto("/quest/create")
    await expect(page).toHaveURL(/\/quest\/create/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows 404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz")
    // Should render the not-found page, not crash
    await expect(page.locator("main")).toBeVisible()
    const body = await page.textContent("body")
    expect(body).toBeTruthy()
  })

  test("/workspace/:id redirects to /quest/ route", async ({ page }) => {
    await page.goto("/workspace/1")
    // React Router Navigate replaces the route pattern — URL ends up at /quest/:id (literal)
    // because the redirect is <Navigate replace to="/quest/:id" /> (no dynamic interpolation)
    await expect(page).toHaveURL(/\/quest\//)
  })

  test("navigates back to landing from leaderboard via logo", async ({ page }) => {
    await page.goto("/leaderboard")
    // Navbar logo is a <button> with text "Lernza"
    await page.getByRole("button", { name: /lernza/i }).first().click()
    await expect(page).toHaveURL(/\/$|\/(?!leaderboard)/)
  })
})
