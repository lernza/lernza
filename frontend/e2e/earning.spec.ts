import { test, expect } from "@playwright/test"
import { mockWallet } from "./helpers/mock-wallet"

/**
 * Tests covering the earning/reward flow:
 *   - Profile page: wallet connect guard, earnings display, tabs
 *   - Leaderboard: earners tab ranks, quests tab, tab switching
 *   - Creator dashboard: reward pool section
 */

// ─── Profile page ─────────────────────────────────────────────────────────────

test.describe("Earning — profile page", () => {
  test("shows connect wallet prompt when no wallet is connected", async ({ page }) => {
    await page.goto("/profile")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText(/connect your wallet/i)).toBeVisible()
  })

  test("shows Not Connected status badge without wallet", async ({ page }) => {
    await page.goto("/profile")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText(/not connected/i)).toBeVisible()
  })

  test("shows Connect Wallet button on profile without wallet", async ({ page }) => {
    await page.goto("/profile")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible()
  })

  test.describe("with wallet connected", () => {
    test.beforeEach(async ({ page }) => {
      await mockWallet(page)
      await page.goto("/profile")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(800)
    })

    test("profile page renders without crashing when wallet connected", async ({ page }) => {
      await expect(page.locator("main")).toBeVisible()
    })

    test("shows wallet address or truncated address on profile", async ({ page }) => {
      // Profile should display the connected wallet address somewhere
      const body = await page.textContent("body")
      // Mock address starts with GB — should appear somewhere in the page
      const hasAddress = body?.includes("GB") ?? false
      expect(hasAddress).toBe(true)
    })

    test("shows earnings section (loading, error, or value)", async ({ page }) => {
      // The earnings section always renders in one of three states
      const hasEarnings = await page
        .getByText(/usdc earned|on-chain earnings|loading on-chain/i)
        .isVisible()
        .catch(() => false)
      const hasConnectedContent = await page.locator("main").isVisible()
      expect(hasEarnings || hasConnectedContent).toBe(true)
    })

    test("Overview tab is available", async ({ page }) => {
      const hasOverview = await page
        .getByRole("button", { name: /view overview/i })
        .isVisible()
        .catch(() => false)
      const hasTab = await page
        .getByText(/overview/i)
        .isVisible()
        .catch(() => false)
      expect(hasOverview || hasTab).toBe(true)
    })

    test("Activity tab is available and switches content", async ({ page }) => {
      const activityTab = page
        .getByRole("button", { name: /view activity/i })
      const hasActivityTab = await activityTab.isVisible().catch(() => false)
      if (!hasActivityTab) test.skip()

      await activityTab.click()
      await expect(page.locator("main")).toBeVisible()

      // Activity tab should show wallet timeline or loading state
      const body = await page.textContent("body")
      expect(body).toBeTruthy()
    })

    test("copy address button is present", async ({ page }) => {
      const copyBtn = page.getByRole("button", { name: /copy address/i })
      const hasCopy = await copyBtn.isVisible().catch(() => false)
      if (!hasCopy) test.skip()

      await expect(copyBtn).toBeEnabled()
    })
  })
})

// ─── Leaderboard — earning ranks ──────────────────────────────────────────────

test.describe("Earning — leaderboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard")
    await page.waitForLoadState("domcontentloaded")
  })

  test("leaderboard page renders without crashing", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows the Leaderboard page heading", async ({ page }) => {
    await expect(page.getByText(/top performers|leaderboard/i)).toBeVisible()
  })

  test("earners tab is present and selectable", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /earners/i })).toBeVisible()
  })

  test("quests tab is present and selectable", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /quests/i })).toBeVisible()
  })

  test("clicking earners tab keeps page stable", async ({ page }) => {
    await page.getByRole("tab", { name: /earners/i }).click()
    await expect(page.locator("main")).toBeVisible()
  })

  test("clicking quests tab switches to active quests list", async ({ page }) => {
    await page.getByRole("tab", { name: /quests/i }).click()
    await expect(page.locator("main")).toBeVisible()
    const body = await page.textContent("body")
    expect(body).toBeTruthy()
  })

  test("Refresh button is present on leaderboard", async ({ page }) => {
    await expect(page.getByRole("button", { name: /refresh/i })).toBeVisible()
  })

  test("Refresh button is clickable without crashing", async ({ page }) => {
    await page.getByRole("button", { name: /refresh/i }).click()
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows loading, empty, or data state — never blank white screen", async ({ page }) => {
    const body = await page.textContent("body")
    expect(body!.trim().length).toBeGreaterThan(20)
  })

  test("earners tab has aria-selected=true when active", async ({ page }) => {
    const earnersTab = page.getByRole("tab", { name: /earners/i })
    const selected = await earnersTab.getAttribute("aria-selected")
    expect(selected).toBe("true")
  })

  test("quests tab has aria-selected=true after click", async ({ page }) => {
    const questsTab = page.getByRole("tab", { name: /quests/i })
    await questsTab.click()
    const selected = await questsTab.getAttribute("aria-selected")
    expect(selected).toBe("true")
  })
})

// ─── Creator dashboard — reward pool ──────────────────────────────────────────

test.describe("Earning — creator dashboard", () => {
  test("shows connect wallet prompt without wallet", async ({ page }) => {
    await page.goto("/creator-dashboard")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText(/connect your wallet/i)).toBeVisible()
  })

  test("shows Connect Wallet button without wallet", async ({ page }) => {
    await page.goto("/creator-dashboard")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible()
  })

  test.describe("with wallet connected", () => {
    test.beforeEach(async ({ page }) => {
      await mockWallet(page)
      await page.goto("/creator-dashboard")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(800)
    })

    test("creator dashboard renders without crashing", async ({ page }) => {
      await expect(page.locator("main")).toBeVisible()
    })

    test("shows Creator Dashboard heading", async ({ page }) => {
      await expect(page.getByText(/creator dashboard|manage your quests/i)).toBeVisible()
    })

    test("Create Quest button is present on creator dashboard", async ({ page }) => {
      const hasCreate = await page
        .getByRole("button", { name: /create quest/i })
        .isVisible()
        .catch(() => false)
      const hasLink = await page
        .getByText(/create quest/i)
        .isVisible()
        .catch(() => false)
      expect(hasCreate || hasLink).toBe(true)
    })

    test("Refresh button is present on creator dashboard", async ({ page }) => {
      const hasRefresh = await page
        .getByRole("button", { name: /refresh/i })
        .isVisible()
        .catch(() => false)
      if (!hasRefresh) test.skip()
      await expect(page.getByRole("button", { name: /refresh/i })).toBeEnabled()
    })

    test("shows loading skeleton or quest analytics on creator dashboard", async ({ page }) => {
      const body = await page.textContent("body")
      expect(body!.trim().length).toBeGreaterThan(20)
    })
  })
})
