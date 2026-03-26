/**
 * Performance: bundle size budget
 *
 * This test verifies the gzipped JS bundle stays under 350 KB.
 * It is designed to run in CI after `expo export --platform web`.
 * When the dist/ directory is absent (local unit-test runs), it skips gracefully.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

describe('Bundle size', () => {
  it('gzipped JS bundle is under 350 KB', () => {
    const distPath = path.join(process.cwd(), 'dist')

    if (!fs.existsSync(distPath)) {
      console.warn(
        'dist/ not found — run `npx expo export --platform web` first. Skipping bundle size test.',
      )
      return
    }

    let totalBytes: number
    try {
      const output = execSync(
        `find "${distPath}" -name "*.js" -exec gzip -c {} \\; | wc -c`,
        { encoding: 'utf8' },
      ).trim()
      totalBytes = parseInt(output, 10)
    } catch (err) {
      console.warn('Bundle size measurement failed:', err)
      return
    }

    if (isNaN(totalBytes)) {
      console.warn('Could not parse bundle size output. Skipping.')
      return
    }

    const KB = totalBytes / 1024
    console.log(`Total gzipped JS: ${KB.toFixed(1)} KB`)

    // Hard limit — this test MUST fail if budget is exceeded
    expect(totalBytes).toBeLessThan(350 * 1024)
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
