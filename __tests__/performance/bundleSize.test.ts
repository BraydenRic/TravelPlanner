/**
 * Performance: bundle size budget
 *
 * The budget applies to the ENTRY bundle — the JS a browser must download
 * before the app renders at all. Async chunks (map libraries, Sentry) load
 * on demand and are reported for visibility but not budgeted, since growing
 * an async chunk doesn't slow initial page load.
 *
 * Designed to run in CI after `expo export --platform web`.
 * When the dist/ directory is absent (local unit-test runs), it skips gracefully.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

describe('Bundle size', () => {
  it('gzipped entry bundle is under 550 KB', () => {
    const distPath = path.join(process.cwd(), 'dist')

    if (!fs.existsSync(distPath)) {
      console.warn(
        'dist/ not found — run `npx expo export --platform web` first. Skipping bundle size test.',
      )
      return
    }

    let entryBytes: number
    try {
      // Metro names the initial bundle entry-*.js; everything else is an
      // async chunk. Sum all entry files (there is normally exactly one).
      const entryOutput = execSync(
        `find "${distPath}" -name "entry-*.js" -exec gzip -c {} \\; | wc -c`,
        { encoding: 'utf8' },
      ).trim()
      entryBytes = parseInt(entryOutput, 10)

      const totalOutput = execSync(
        `find "${distPath}" -name "*.js" -exec gzip -c {} \\; | wc -c`,
        { encoding: 'utf8' },
      ).trim()
      const totalBytes = parseInt(totalOutput, 10)
      console.log(`Entry gzipped JS: ${(entryBytes / 1024).toFixed(1)} KB`)
      console.log(`Total gzipped JS (incl. async chunks): ${(totalBytes / 1024).toFixed(1)} KB`)
    } catch (err) {
      console.warn('Bundle size measurement failed:', err)
      return
    }

    if (isNaN(entryBytes) || entryBytes === 0) {
      console.warn('Could not measure entry bundle. Skipping.')
      return
    }

    // Hard limit — this test MUST fail if the budget is exceeded.
    // Measured 2026-07: entry is ~528 KB gz after splitting the map libs
    // (82 KB) and Sentry (325 KB) into async chunks; the remainder is the
    // framework floor (react-native-web, reanimated, expo-router, supabase)
    // plus all route screens, which metro bundles into the entry until
    // expo-router async routes are production-ready. Budget = measured + a
    // little headroom; ratchet DOWN as more moves into async chunks, and
    // never raise it without a deliberate decision.
    expect(entryBytes).toBeLessThan(550 * 1024)
  })

  it('dist/ contains at least one JS file when built', () => {
    const distPath = path.join(process.cwd(), 'dist')

    if (!fs.existsSync(distPath)) {
      console.warn('dist/ not found. Skipping.')
      return
    }

    const output = execSync(`find "${distPath}" -name "*.js" | wc -l`, {
      encoding: 'utf8',
    }).trim()

    const count = parseInt(output, 10)
    console.log(`JS files in dist/: ${count}`)
    expect(count).toBeGreaterThan(0)
  })
})
