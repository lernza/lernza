import { test, expect } from "@playwright/test"

test.describe("Certificate page", () => {
  test("loads the public certificate route", async ({ page }) => {
    await page.goto("/certificate/1")

    // The page always renders a top-level heading mentioning the certificate,
    // whether it shows the certificate itself or the "not available" state.
    await expect(
      page.getByRole("heading", { level: 1, name: /certificate/i }),
    ).toBeVisible()
  })

  test("reflects certificate availability state", async ({ page }) => {
    await page.goto("/certificate/1")

    await expect(
      page.getByText(/Certificate of Completion|Certificate not available/),
    ).toBeVisible()
  })

  test("does not break client-side routing for arbitrary certificate ids", async ({
    page,
  }) => {
    await page.goto("/certificate/42")

    await expect(page).toHaveURL(/\/certificate\/42/)
    await expect(
      page.getByRole("heading", { level: 1, name: /certificate/i }),
    ).toBeVisible()
  })
})
