/**
 * Playwright configuration — Driftmark E2E tests
 *
 * Runs the web E2E suite against the Expo web server.
 * CI: uses 2 retries and always spins up a fresh server.
 * Local: reuses an existing server if one is already running.
 */

import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e/web',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,

  // ---------------------------------------------------------------------------
  // Browser & viewport configuration
  // ---------------------------------------------------------------------------

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },
  ],

  // ---------------------------------------------------------------------------
  // Browser settings (shared)
  // ---------------------------------------------------------------------------

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // ---------------------------------------------------------------------------
  // Web server
  // ---------------------------------------------------------------------------

  webServer: {
    command: 'npx expo start --web --no-dev',
    port: 8081,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
})
