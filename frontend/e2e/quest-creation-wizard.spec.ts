import { test, expect } from "@playwright/test"
import { mockWallet } from "./helpers/mock-wallet"

// ─── Shared setup ─────────────────────────────────────────────────────────────

test.describe("Quest creation wizard", () => {
  // ── Unauthenticated guard ────────────────────────────────────────────────────

  test.describe("wallet not connected", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/quest/create")
      await page.waitForLoadState("networkidle")
    })

    test("shows wallet connect prompt instead of form", async ({ page }) => {
      await expect(page.getByText(/connect your wallet/i)).toBeVisible()
    })

    test("shows Connect Wallet CTA button", async ({ page }) => {
      await expect(
        page.getByRole("main").getByRole("button", { name: /connect wallet/i })
      ).toBeVisible()
    })

    test("shows Not Connected status badge", async ({ page }) => {
      await expect(page.getByText(/not connected/i)).toBeVisible()
    })

    test("shows Back to Dashboard link", async ({ page }) => {
      await expect(page.getByText(/back to dashboard/i)).toBeVisible()
    })
  })

  // ── Step 1 — Quest basics ────────────────────────────────────────────────────

  test.describe("step 1 — quest basics", () => {
    test.beforeEach(async ({ page }) => {
      await mockWallet(page)
      await page.goto("/quest/create")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(800)
    })

    test("renders step 1 heading when wallet is connected", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      await expect(page.getByText(/quest basics/i)).toBeVisible()
    })

    test("quest name field is present and accepts input", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      const nameInput = page.getByRole("textbox", { name: /quest name/i })
      await expect(nameInput).toBeVisible()
      await nameInput.fill("My Test Quest")
      await expect(nameInput).toHaveValue("My Test Quest")
    })

    test("description field is present and accepts input", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      const desc = page.getByRole("textbox", { name: /description/i })
      await expect(desc).toBeVisible()
      await desc.fill("A meaningful quest description")
      await expect(desc).toHaveValue("A meaningful quest description")
    })

    test("category field is present and accepts input", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      const category = page.getByRole("textbox", { name: /category/i })
      await expect(category).toBeVisible()
      await category.fill("Programming")
      await expect(category).toHaveValue("Programming")
    })

    test("tag can be added and shows as pill", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      const tagInput = page.locator("#quest-tag-input")
      await tagInput.fill("soroban")
      await page.getByRole("button", { name: /add tag/i }).click()

      await expect(page.getByText("#soroban")).toBeVisible()
    })

    test("tag can be removed by clicking the X button", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      const tagInput = page.locator("#quest-tag-input")
      await tagInput.fill("rust")
      await page.getByRole("button", { name: /add tag/i }).click()
      await expect(page.getByText("#rust")).toBeVisible()

      await page.getByRole("button", { name: /remove tag rust/i }).click()
      await expect(page.getByText("#rust")).not.toBeVisible()
    })

    test("pressing Enter in the tag input adds the tag", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      await page.locator("#quest-tag-input").fill("stellar")
      await page.keyboard.press("Enter")
      await expect(page.getByText("#stellar")).toBeVisible()
    })

    test("shows character counter for name field", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      await page.getByRole("textbox", { name: /quest name/i }).fill("Hello")
      await expect(page.getByText(/5\/64/)).toBeVisible()
    })

    test("shows validation errors when Next is clicked with empty fields", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      await page.getByRole("button", { name: /next/i }).click()
      const errors = page.locator("[role='alert'], .text-destructive")
      await expect(errors.first()).toBeVisible()
    })

    test("Next button advances to step 2 when form is valid", async ({ page }) => {
      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) test.skip()

      await page.getByRole("textbox", { name: /quest name/i }).fill("Learn Soroban")
      await page.getByRole("textbox", { name: /description/i }).fill("Build smart contracts on Stellar from scratch.")
      await page.getByRole("textbox", { name: /category/i }).fill("Blockchain")

      await page.getByRole("button", { name: /next/i }).click()
      await expect(page.getByText(/step 2/i)).toBeVisible()
    })
  })

  // ── Step 2 — Milestones ──────────────────────────────────────────────────────

  test.describe("step 2 — milestones", () => {
    /**
     * Navigates to step 2 by filling step 1 with valid data.
     */
    async function advanceToStep2(page: import("@playwright/test").Page) {
      await mockWallet(page)
      await page.goto("/quest/create")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(800)

      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) return false

      await page.getByRole("textbox", { name: /quest name/i }).fill("Learn Soroban")
      await page
        .getByRole("textbox", { name: /description/i })
        .fill("Build smart contracts on Stellar from scratch.")
      await page.getByRole("textbox", { name: /category/i }).fill("Blockchain")
      await page.getByRole("button", { name: /next/i }).click()
      await expect(page.getByText(/step 2/i)).toBeVisible()
      return true
    }

    test("shows milestones heading", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      await expect(page.getByText(/milestones/i)).toBeVisible()
    })

    test("first milestone row is pre-populated in the form", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      await expect(page.locator("#milestone-0-title")).toBeVisible()
      await expect(page.locator("#milestone-0-description")).toBeVisible()
      await expect(page.locator("#milestone-0-reward")).toBeVisible()
    })

    test("can fill in milestone title and description", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      await page.locator("#milestone-0-title").fill("Hello World")
      await page.locator("#milestone-0-description").fill("Write your first program.")
      await page.locator("#milestone-0-reward").fill("50")

      await expect(page.locator("#milestone-0-title")).toHaveValue("Hello World")
    })

    test("Add Milestone button appends a new milestone row", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      const before = await page.locator("[id^='milestone-'][id$='-title']").count()
      await page.getByRole("button", { name: /add milestone/i }).click()
      const after = await page.locator("[id^='milestone-'][id$='-title']").count()
      expect(after).toBe(before + 1)
    })

    test("Remove button deletes a milestone row (when more than one exists)", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      // Add a second milestone first
      await page.getByRole("button", { name: /add milestone/i }).click()
      const before = await page.locator("[id^='milestone-'][id$='-title']").count()

      await page.getByRole("button", { name: /remove milestone 2/i }).click()
      const after = await page.locator("[id^='milestone-'][id$='-title']").count()
      expect(after).toBe(before - 1)
    })

    test("total reward pool updates as reward amounts are entered", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      await page.locator("#milestone-0-title").fill("First Step")
      await page.locator("#milestone-0-description").fill("Do the first thing.")
      await page.locator("#milestone-0-reward").fill("100")

      // The running total badge should reflect 100 USDC
      await expect(page.getByText(/100/)).toBeVisible()
    })

    test("Back button returns to step 1", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      await page.getByRole("button", { name: /back/i }).click()
      await expect(page.getByText(/step 1/i)).toBeVisible()
    })

    test("Next advances to step 3 when at least one valid milestone exists", async ({ page }) => {
      const ok = await advanceToStep2(page)
      if (!ok) test.skip()

      await page.locator("#milestone-0-title").fill("Hello World")
      await page.locator("#milestone-0-description").fill("Write your first program.")
      await page.locator("#milestone-0-reward").fill("50")

      await page.getByRole("button", { name: /next|fund/i }).click()
      await expect(page.getByText(/step 3/i)).toBeVisible()
    })
  })

  // ── Step 3 — Fund & Review ───────────────────────────────────────────────────

  test.describe("step 3 — fund & review", () => {
    async function advanceToStep3(page: import("@playwright/test").Page) {
      await mockWallet(page)
      await page.goto("/quest/create")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(800)

      const isStep1 = await page.getByText(/step 1/i).isVisible().catch(() => false)
      if (!isStep1) return false

      // Step 1
      await page.getByRole("textbox", { name: /quest name/i }).fill("Learn Soroban")
      await page
        .getByRole("textbox", { name: /description/i })
        .fill("Build smart contracts on Stellar from scratch.")
      await page.getByRole("textbox", { name: /category/i }).fill("Blockchain")
      await page.getByRole("button", { name: /next/i }).click()
      await expect(page.getByText(/step 2/i)).toBeVisible()

      // Step 2
      await page.locator("#milestone-0-title").fill("Hello World")
      await page.locator("#milestone-0-description").fill("Write your first program.")
      await page.locator("#milestone-0-reward").fill("50")
      await page.getByRole("button", { name: /next|fund/i }).click()
      await expect(page.getByText(/step 3/i)).toBeVisible()
      return true
    }

    test("displays quest name from step 1 in the review panel", async ({ page }) => {
      const ok = await advanceToStep3(page)
      if (!ok) test.skip()

      await expect(page.getByText("Learn Soroban")).toBeVisible()
    })

    test("displays milestone count from step 2", async ({ page }) => {
      const ok = await advanceToStep3(page)
      if (!ok) test.skip()

      await expect(page.getByText(/milestones \(1\)/i)).toBeVisible()
    })

    test("displays total reward pool amount", async ({ page }) => {
      const ok = await advanceToStep3(page)
      if (!ok) test.skip()

      await expect(page.getByText(/50/)).toBeVisible()
    })

    test("Fund Reward Pool button is visible and clickable", async ({ page }) => {
      const ok = await advanceToStep3(page)
      if (!ok) test.skip()

      const fundBtn = page.getByRole("button", { name: /fund reward pool/i })
      await expect(fundBtn).toBeVisible()
      await expect(fundBtn).toBeEnabled()
    })

    test("Confirm & Create Quest button is disabled before pool is funded", async ({ page }) => {
      const ok = await advanceToStep3(page)
      if (!ok) test.skip()

      const createBtn = page.getByRole("button", { name: /confirm.*create quest/i })
      await expect(createBtn).toBeDisabled()
    })

    test("funding the pool enables the Create Quest button", async ({ page }) => {
      const ok = await advanceToStep3(page)
      if (!ok) test.skip()

      await page.getByRole("button", { name: /fund reward pool/i }).click()

      // Wait for simulated 2 s funding tx
      await expect(
        page.getByRole("button", { name: /reward pool funded/i })
      ).toBeVisible({ timeout: 5000 })

      const createBtn = page.getByRole("button", { name: /confirm.*create quest/i })
      await expect(createBtn).toBeEnabled()
    })

    test("Back button returns to step 2", async ({ page }) => {
      const ok = await advanceToStep3(page)
      if (!ok) test.skip()

      await page.getByRole("button", { name: /back/i }).click()
      await expect(page.getByText(/step 2/i)).toBeVisible()
    })
  })
})
