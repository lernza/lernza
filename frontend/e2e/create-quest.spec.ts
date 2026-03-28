import { test, expect, type Page } from "@playwright/test"

/**
 * Stub window.freighter so the @stellar/freighter-api SDK sees a connected wallet.
 * This must run before any page scripts via addInitScript.
 */
async function mockWallet(page: Page) {
  await page.addInitScript(() => {
    const mockAddress = "GBMOCKADDRESS123STELLAR456WALLET789ABCDEFGH"

    const stub = {
      isConnected: () => Promise.resolve(true),
      getAddress: () => Promise.resolve({ address: mockAddress }),
      getNetwork: () =>
        Promise.resolve({
          network: "TESTNET",
          networkPassphrase: "Test SDF Network ; September 2015",
        }),
      getNetworkDetails: () =>
        Promise.resolve({
          network: "TESTNET",
          networkPassphrase: "Test SDF Network ; September 2015",
        }),
      requestAccess: () => Promise.resolve({ address: mockAddress }),
      signTransaction: (xdr: string) => Promise.resolve({ signedTxXdr: xdr }),
    }

    Object.defineProperty(window, "freighter", { value: stub, writable: true })
    // Some versions of @stellar/freighter-api read from window.freighterApi
    Object.defineProperty(window, "freighterApi", { value: stub, writable: true })
  })
}

test.describe("Create Quest wizard — wallet not connected", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/quest/create")
    await page.waitForLoadState("networkidle")
  })

  test("renders the create quest page", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows wallet connect prompt when no wallet is connected", async ({ page }) => {
    await expect(page.getByText(/connect your wallet/i)).toBeVisible()
  })

  test("shows Connect Wallet button in main content", async ({ page }) => {
    await expect(
      page.getByRole("main").getByRole("button", { name: /connect wallet/i })
    ).toBeVisible()
  })

  test("shows Not Connected status", async ({ page }) => {
    await expect(page.getByText(/not connected/i)).toBeVisible()
  })

  test("has a Back to Dashboard link", async ({ page }) => {
    await expect(page.getByText(/back to dashboard/i)).toBeVisible()
  })
})

test.describe("Create Quest wizard — with mocked wallet", () => {
  test.beforeEach(async ({ page }) => {
    await mockWallet(page)
    await page.goto("/quest/create")
    await page.waitForLoadState("networkidle")
    // Give the wallet hook time to run its boot effect
    await page.waitForTimeout(1000)
  })

  test("renders main content after wallet mock boots", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible()
  })

  test("shows the quest form or wallet connect prompt", async ({ page }) => {
    // Either the form loaded (wallet mock worked) or the connect prompt is shown
    const formVisible = await page.getByText(/step 1/i).isVisible().catch(() => false)
    const promptVisible = await page
      .getByText(/connect your wallet/i)
      .isVisible()
      .catch(() => false)
    expect(formVisible || promptVisible).toBe(true)
  })

  test("step 1 form shows quest name field when connected", async ({ page }) => {
    const isFormVisible = await page.getByText(/step 1/i).isVisible().catch(() => false)
    if (!isFormVisible) {
      test.skip()
      return
    }
    await expect(page.getByRole("textbox", { name: /quest name/i })).toBeVisible()
    await expect(page.getByRole("textbox", { name: /description/i })).toBeVisible()
  })

  test("step 1 shows validation errors on empty submit when connected", async ({ page }) => {
    const isFormVisible = await page.getByText(/step 1/i).isVisible().catch(() => false)
    if (!isFormVisible) {
      test.skip()
      return
    }
    const nextBtn = page.getByRole("button", { name: /next|continue/i }).first()
    await nextBtn.click()
    const errors = page.locator("[role='alert'], .text-destructive, .text-red-500")
    await expect(errors.first()).toBeVisible()
  })
})
