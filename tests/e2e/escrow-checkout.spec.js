import { test, expect } from "@playwright/test";

/**
 * escrow-checkout.spec.js
 * Covers: AI Copilot assistant, Listing Details page, unauthenticated
 * purchase gate, ScamShield chat protection, MyOrders page guard,
 * and mobile responsive layout checks.
 */

test.describe("🔐 E2E: Escrow Checkout & Security Flow", () => {

  // ----------------------------------------------------------------
  // TC-01: Listing Details page loads with key UI elements
  // ----------------------------------------------------------------
  test("TC-01: Listing Details page — platform icon, price, & escrow badge visible", async ({ page }) => {
    // Navigate to marketplace first and pick a listing
    await page.goto("/marketplace");
    await page.waitForTimeout(2000);

    // Click the first listing card that appears
    const listingCard = page.locator("a[href*='/listing/']").first();

    if (await listingCard.isVisible()) {
      await listingCard.click();

      // Verify we are on a listing details page
      await expect(page).toHaveURL(/.*\/listing\//);

      // Listing title should be present
      const title = page.locator("h1, h2").first();
      await expect(title).toBeVisible();

      // Price display (₹ sign)
      const price = page.getByText(/₹/).first();
      await expect(price).toBeVisible();

      // Escrow protection badge / shield icon should be visible
      const escrowBadge = page.getByText(/Escrow|Protected|Secure/i).first();
      await expect(escrowBadge).toBeVisible();
    }
  });

  // ----------------------------------------------------------------
  // TC-02: Unauthenticated "Buy Now" triggers Clerk Sign-In modal
  // ----------------------------------------------------------------
  test("TC-02: Unauthenticated user — Purchase blocked, Sign-In modal opens", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForTimeout(2000);

    const listingCard = page.locator("a[href*='/listing/']").first();
    if (await listingCard.isVisible()) {
      await listingCard.click();
      await expect(page).toHaveURL(/.*\/listing\//);

      // Click Buy Now button (unauthenticated)
      const buyBtn = page.getByRole("button", { name: /Buy Now|Purchase Now|Buy with Escrow/i }).first();
      if (await buyBtn.isVisible()) {
        await buyBtn.click();
        // Clerk modal should appear (any Clerk component)
        const clerkModal = page.locator(".cl-rootBox, .cl-modalContent, [data-clerk-id]").first();
        await expect(clerkModal).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // ----------------------------------------------------------------
  // TC-03: Unauthenticated "Message Seller" triggers Sign-In modal
  // ----------------------------------------------------------------
  test("TC-03: Unauthenticated user — Chat blocked, Sign-In modal opens", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForTimeout(2000);

    const listingCard = page.locator("a[href*='/listing/']").first();
    if (await listingCard.isVisible()) {
      await listingCard.click();
      await expect(page).toHaveURL(/.*\/listing\//);

      // Click Message / Chat button (unauthenticated)
      const chatBtn = page.getByRole("button", { name: /Message|Chat|Contact Seller/i }).first();
      if (await chatBtn.isVisible()) {
        await chatBtn.click();
        const clerkModal = page.locator(".cl-rootBox, .cl-modalContent, [data-clerk-id]").first();
        await expect(clerkModal).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // ----------------------------------------------------------------
  // TC-04: My Orders page — redirects unauthenticated users
  // ----------------------------------------------------------------
  test("TC-04: My Orders page — unauthenticated user is redirected or shown Sign In", async ({ page }) => {
    await page.goto("/orders");

    // Should either redirect away or show a sign-in prompt
    const isOnSignIn = page.url().includes("sign-in") || page.url().includes("clerk");
    const signInPrompt = page.getByText(/Sign In|Login|Please sign in/i).first();
    const clerkModal = page.locator(".cl-rootBox").first();

    const hasAnyAuthGate =
      isOnSignIn ||
      (await signInPrompt.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await clerkModal.isVisible({ timeout: 3000 }).catch(() => false));

    expect(hasAnyAuthGate).toBeTruthy();
  });

  // ----------------------------------------------------------------
  // TC-05: AI Floating Copilot — Opens, accepts prompt, shows reply
  // ----------------------------------------------------------------
  test("TC-05: Socialy AI Copilot — open, type question, verify message bubble", async ({ page }) => {
    await page.goto("/");

    // 1. Click floating AI launcher
    const aiLauncher = page.getByRole("button", { name: /Ask Socialy AI/i });
    await expect(aiLauncher).toBeVisible();
    await aiLauncher.click();

    // 2. Verify AI modal header is displayed
    const aiHeader = page.getByText(/Socialy AI/i).first();
    await expect(aiHeader).toBeVisible();

    // 3. Locate input and type question
    const aiInput = page.getByPlaceholder(/Ask anything about Socialy/i);
    await expect(aiInput).toBeVisible();
    await aiInput.fill("How does escrow work?");

    // 4. Submit via Enter key
    await aiInput.press("Enter");

    // 5. User's message bubble should appear in the thread
    const userBubble = page.getByText("How does escrow work?");
    await expect(userBubble).toBeVisible();
  });

  // ----------------------------------------------------------------
  // TC-06: AI Copilot — Minimize button hides the modal
  // ----------------------------------------------------------------
  test("TC-06: AI Copilot — Minimize button collapses assistant panel", async ({ page }) => {
    await page.goto("/");

    const aiLauncher = page.getByRole("button", { name: /Ask Socialy AI/i });
    await aiLauncher.click();

    const aiHeader = page.getByText(/Socialy AI/i).first();
    await expect(aiHeader).toBeVisible();

    // Minimize the panel
    const minimizeBtn = page.getByTitle(/Minimize AI Assistant/i);
    await expect(minimizeBtn).toBeVisible();
    await minimizeBtn.click();

    // Launcher button should reappear
    await expect(aiLauncher).toBeVisible();
  });

  // ----------------------------------------------------------------
  // TC-07: Listing Details — Image carousel navigation (prev/next)
  // ----------------------------------------------------------------
  test("TC-07: Listing Details — Image carousel prev/next buttons work", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForTimeout(2000);

    const listingCard = page.locator("a[href*='/listing/']").first();
    if (await listingCard.isVisible()) {
      await listingCard.click();
      await expect(page).toHaveURL(/.*\/listing\//);

      // Check for next arrow (ChevronRight)
      const nextBtn = page.getByRole("button", { name: /next|right|›/i }).first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        // Verify the button still exists after navigating (carousel didn't break)
        await expect(nextBtn).toBeVisible();
      }
    }
  });

  // ----------------------------------------------------------------
  // TC-08: Responsive layout — Mobile viewport (iPhone 14)
  // ----------------------------------------------------------------
  test("TC-08: Mobile viewport (390px) — Nav, Hero & AI button all visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // 1. Navigation bar renders on mobile
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // 2. Hero search input is accessible on mobile
    const searchInput = page.getByPlaceholder(/Search by platform, niche/i);
    await expect(searchInput).toBeVisible();

    // 3. Floating AI button still visible and fixed on mobile
    const aiLauncher = page.getByRole("button", { name: /Ask Socialy AI/i });
    await expect(aiLauncher).toBeVisible();
  });

  // ----------------------------------------------------------------
  // TC-09: Responsive layout — Tablet viewport (iPad)
  // ----------------------------------------------------------------
  test("TC-09: Tablet viewport (768px) — Marketplace renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/marketplace");

    // Filter sidebar heading should be visible on tablet
    const filtersHeading = page.getByRole("heading", { name: "Filters" });
    await expect(filtersHeading).toBeVisible();
  });

  // ----------------------------------------------------------------
  // TC-10: 404 / Unknown route — App doesn't crash
  // ----------------------------------------------------------------
  test("TC-10: Unknown route — App handles 404 gracefully (no crash)", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-12345");

    // App should still render something (React router renders fallback or home)
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Must not show a raw Node.js error page
    const pageContent = await body.textContent();
    expect(pageContent).not.toContain("Cannot GET /this-route-does-not-exist-12345");
  });

});
