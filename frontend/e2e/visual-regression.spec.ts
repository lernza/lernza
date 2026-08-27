import { test, expect } from "@playwright/test"

const DESKTOP = { width: 1280, height: 720 }
const NARROW_MOBILE = { width: 375, height: 667 }

test.describe("Visual regression", () => {
  test.describe("Landing page", () => {
    test("desktop screenshot", async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await page.goto("/")
      await expect(page).toHaveTitle(/Lernza/i)
      await expect(page).toHaveScreenshot("landing-desktop.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })

    test("narrow mobile screenshot", async ({ page }) => {
      await page.setViewportSize(NARROW_MOBILE)
      await page.goto("/")
      await expect(page).toHaveTitle(/Lernza/i)
      await expect(page).toHaveScreenshot("landing-mobile.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })
  })

  test.describe("Dashboard page", () => {
    test("desktop screenshot", async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await page.goto("/dashboard")
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot("dashboard-desktop.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })

    test("narrow mobile screenshot", async ({ page }) => {
      await page.setViewportSize(NARROW_MOBILE)
      await page.goto("/dashboard")
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot("dashboard-mobile.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })
  })

  test.describe("Quest view page", () => {
    test("desktop screenshot", async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await page.goto("/quest/1")
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot("quest-view-desktop.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })

    test("narrow mobile screenshot", async ({ page }) => {
      await page.setViewportSize(NARROW_MOBILE)
      await page.goto("/quest/1")
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot("quest-view-mobile.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })
  })

  test.describe("Profile page", () => {
    test("desktop screenshot", async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await page.goto("/profile")
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot("profile-desktop.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })

    test("narrow mobile screenshot", async ({ page }) => {
      await page.setViewportSize(NARROW_MOBILE)
      await page.goto("/profile")
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot("profile-mobile.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      })
    })
  })
})
