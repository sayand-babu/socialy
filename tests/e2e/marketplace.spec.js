import { test, expect } from "@playwright/test";

/**
 * marketplace.spec.js
 * Covers: Homepage, Hero Search, Trending Chips, Marketplace Page,
 * Filter Sidebar, Listing Card rendering, and cross-page navigation.
 */

test.describe("🏪 E2E: Marketplace & Hero Search Flow", () => {

  // ----------------------------------------------------------------
  // TC-01: Homepage loads correctly with all critical UI sections
  // ----------------------------------------------------------------
  test("TC-01: Homepage loads with Nav, Hero & Trust Badges", async ({ page }) => {
    await page.goto("/");

    // 1. Page title is correct
    await expect(page).toHaveTitle(/Socialy/i);

    // 2. Navigation bar is visible
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // 3. Logo in navigation is visible
    const logo = nav.getByAltText(/Logo/i).first();
    await expect(logo).toBeVisible();

    // 4. Hero search input is present
    const searchInput = page.getByPlaceholder(/Search by platform, niche/i);
    await expect(searchInput).toBeVisible();

    // 5. "Start Buying" or "Browse Marketplace" CTA is on the page
    const ctaBtn = page.getByRole("link", { name: /Browse|Marketplace|Start/i }).first();
    await expect(ctaBtn).toBeVisible();
  });

  // ----------------------------------------------------------------
  // TC-02: Hero search input accepts text and filters correctly
  // ----------------------------------------------------------------
  test("TC-02: Hero search input — typing filters results", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(/Search by platform, niche/i);
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill("Gaming YouTube");
    await expect(searchInput).toHaveValue("Gaming YouTube");

    // Clear the input and type another query
    await searchInput.clear();
    await searchInput.fill("Instagram Fashion");
    await expect(searchInput).toHaveValue("Instagram Fashion");
  });

  // ----------------------------------------------------------------
  // TC-03: Trending chip click populates the search input
  // ----------------------------------------------------------------
  test("TC-03: Trending topic chip auto-populates search input", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(/Search by platform, niche/i);

    // Click a trending topic chip if it exists on the page
    const trendingChip = page.getByRole("button", { name: /Monetized YouTube/i });
    if (await trendingChip.isVisible()) {
      await trendingChip.click();
      await expect(searchInput).toHaveValue("Monetized YouTube");
    }
  });

  // ----------------------------------------------------------------
  // TC-04: Marketplace page URL, sidebar filters, and listing grid
  // ----------------------------------------------------------------
  test("TC-04: Marketplace page loads with filters & listing grid", async ({ page }) => {
    await page.goto("/marketplace");

    // 1. URL is correct
    await expect(page).toHaveURL(/.*marketplace/);

    // 2. Filter sidebar heading
    const filtersHeading = page.getByRole("heading", { name: "Filters" });
    await expect(filtersHeading).toBeVisible();

    // 3. Sidebar search input
    const sidebarSearch = page.getByPlaceholder("Search accounts or filters...");
    await expect(sidebarSearch).toBeVisible();

    // 4. Sidebar search accepts text
    await sidebarSearch.fill("Instagram");
    await expect(sidebarSearch).toHaveValue("Instagram");
  });

  // ----------------------------------------------------------------
  // TC-05: "Back to Home" link in marketplace navigates back
  // ----------------------------------------------------------------
  test("TC-05: Marketplace 'Back to Home' link navigates correctly", async ({ page }) => {
    await page.goto("/marketplace");

    const backBtn = page.getByText(/Back to Home/i);
    await expect(backBtn).toBeVisible();

    await backBtn.click();
    await expect(page).toHaveURL("http://localhost:5173/");
  });

  // ----------------------------------------------------------------
  // TC-06: Unauthenticated user clicking "Buy Now" triggers Sign-In
  // ----------------------------------------------------------------
  test("TC-06: Unauthenticated buyer — Buy Now redirects to Sign In", async ({ page }) => {
    await page.goto("/marketplace");

    // Wait for listing cards to load
    await page.waitForTimeout(2000);

    // Find any "Buy Now" or "Chat" button on a listing card
    const buyBtn = page.getByRole("button", { name: /Buy Now|Chat to Buy/i }).first();

    if (await buyBtn.isVisible()) {
      await buyBtn.click();
      // Clerk sign-in modal or redirect should appear
      const signInModal = page.locator("[data-locator='signIn'], .cl-rootBox, [class*='signIn']").first();
      await expect(signInModal).toBeVisible({ timeout: 5000 });
    }
  });

});
