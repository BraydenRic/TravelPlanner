/**
 * E2E: Accessibility checks (WCAG 2.1 AA)
 *
 * Uses @axe-core/playwright to run automated accessibility audits on key screens.
 * Failures here indicate real accessibility violations that must be fixed before
 * merging — this test MUST fail if violations are found.
 *
 * Run: npx playwright test __tests__/e2e/web/accessibility.spec.ts
 *
 * Prerequisites:
 *   npm install --save-dev @axe-core/playwright
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8081'

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  // -------------------------------------------------------------------------
  // Login screen
  // -------------------------------------------------------------------------

  test('login screen passes WCAG AA', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    if (results.violations.length > 0) {
      const report = results.violations
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description}\n` +
            v.nodes.map((n) => `  • ${n.target}`).join('\n'),
        )
        .join('\n\n')
      console.error('Accessibility violations:\n' + report)
    }

    expect(results.violations).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Interactive elements have accessible labels
  // -------------------------------------------------------------------------

  test('all buttons on login screen have accessible names', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    const buttons = page.getByRole('button')
    const count = await buttons.count()

    // There should be at least 1 button (the Google sign-in button)
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      const textContent = await button.textContent()
      const accessibleName = (ariaLabel ?? textContent ?? '').trim()

      expect(accessibleName.length).toBeGreaterThan(0)
    }
  })

  // -------------------------------------------------------------------------
  // Images have alt text
  // -------------------------------------------------------------------------

  test('decorative images have empty alt or role=presentation', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')
      // alt must be present (can be empty string for decorative, non-empty for informative)
      expect(alt !== null || role === 'presentation').toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Focus management — keyboard navigation
  // -------------------------------------------------------------------------

  test('login screen elements are reachable via Tab key', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // Tab through the page and ensure at least one focusable element exists
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)

    // After a Tab keypress from the body, something should have received focus
    expect(focusedElement).toBeDefined()
    expect(focusedElement).not.toBe('BODY')
  })

  // -------------------------------------------------------------------------
  // Color contrast (part of WCAG AA — covered by axe-core above)
  // -------------------------------------------------------------------------

  test('no color contrast violations on login screen', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze()

    if (results.violations.length > 0) {
      console.error(
        'Color contrast violations:',
        results.violations.map((v) => v.description),
      )
    }

    expect(results.violations).toHaveLength(0)
  })
})
