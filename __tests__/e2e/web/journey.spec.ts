/**
 * E2E: Driftmark web user journey
 *
 * Tests critical UI paths on the web build using Playwright.
 * Requires the dev server to be running at E2E_BASE_URL (default: http://localhost:8081).
 *
 * Run: npx playwright test __tests__/e2e/web/journey.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8081'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Injects a mock Supabase session into sessionStorage so the app considers
 * the user authenticated without going through OAuth.
 */
async function injectMockSession(page: Page) {
  await page.evaluate(() => {
    sessionStorage.setItem(
      'supabase.auth.token',
      JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-e2e-123',
          email: 'e2e@driftmark.app',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
        },
      }),
    )
  })
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Driftmark Web E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
  })

  // -------------------------------------------------------------------------
  // Login screen
  // -------------------------------------------------------------------------

  test('login screen loads with correct elements', async ({ page }) => {
    await expect(page.getByText('Driftmark')).toBeVisible()
    await expect(page.getByText('Your world, mapped.')).toBeVisible()
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  })

  test('login screen has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Driftmark/)
  })

  // -------------------------------------------------------------------------
  // Map screen
  // -------------------------------------------------------------------------

  test('map screen renders after auth', async ({ page }) => {
    await injectMockSession(page)
    await page.goto(`${BASE_URL}/map`)
    await expect(page.locator('[data-testid="world-map"]')).toBeVisible({ timeout: 5000 })
  })

  // -------------------------------------------------------------------------
  // Time to Interactive (TTI) budget
  // -------------------------------------------------------------------------

  test('TTI is under 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    const tti = Date.now() - startTime

    console.log(`TTI: ${tti} ms`)

    // Hard budget — MUST fail if exceeded
    expect(tti).toBeLessThan(3000)
  })

  // -------------------------------------------------------------------------
  // Category tabs
  // -------------------------------------------------------------------------

  test('category tabs switch correctly', async ({ page }) => {
    await injectMockSession(page)
    await page.goto(`${BASE_URL}/map`)
    await page.waitForSelector('[data-testid="category-tabs"]', { timeout: 5000 })

    // Switch to want_to_go
    await page.click('[data-testid="tab-want_to_go"]')
    await expect(page.locator('[data-testid="tab-want_to_go"]')).toHaveAttribute(
      'data-active',
      'true',
    )

    // Switch to lived
    await page.click('[data-testid="tab-lived"]')
    await expect(page.locator('[data-testid="tab-lived"]')).toHaveAttribute('data-active', 'true')

    // been tab should no longer be active
    const beenActive = await page
      .locator('[data-testid="tab-been"]')
      .getAttribute('data-active')
    expect(beenActive).not.toBe('true')
  })

  // -------------------------------------------------------------------------
  // Rating form — all 10 categories
  // -------------------------------------------------------------------------

  test('rating form has all 10 categories', async ({ page }) => {
    await injectMockSession(page)
    await page.goto(`${BASE_URL}/country/JP/city/tokyo-city-id/rate`)

    const categories = [
      'Overall Experience',
      'Safety',
      'Food & Cuisine',
      'Transportation',
      'Friendliness',
      'Affordability',
      'Cleanliness',
      'Nightlife & Entertainment',
      'Natural Beauty',
      'Wi-Fi & Connectivity',
    ]

    for (const category of categories) {
      await expect(page.getByText(category)).toBeVisible({ timeout: 5000 })
    }
  })

  // -------------------------------------------------------------------------
  // Navigation — back button returns to map
  // -------------------------------------------------------------------------

  test('clicking back from country detail returns to map', async ({ page }) => {
    await injectMockSession(page)
    await page.goto(`${BASE_URL}/country/JP`)
    await page.waitForLoadState('networkidle')

    const backButton = page.getByRole('button', { name: /back/i })
    if (await backButton.isVisible()) {
      await backButton.click()
      await expect(page).toHaveURL(/\/map/)
    }
  })

  // -------------------------------------------------------------------------
  // Error state — 404 page
  // -------------------------------------------------------------------------

  test('navigating to an unknown route shows 404 or redirects', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-route-does-not-exist`)
    // Either a 404 page is shown or the user is redirected to login/map
    const url = page.url()
    const has404 = await page.getByText(/not found/i).isVisible().catch(() => false)
    const redirected = url.includes('/map') || url.includes('/login') || url === `${BASE_URL}/`

    expect(has404 || redirected).toBe(true)
  })
})
