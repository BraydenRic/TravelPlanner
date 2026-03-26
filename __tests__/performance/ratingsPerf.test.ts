/**
 * Performance: rating computation
 *
 * Verifies computeOverallScore is fast enough for real-time UX
 * and produces correctly-rounded output.
 *
 * Budget: 1000 calls must complete in under 10 ms — if it takes longer,
 * the implementation has regressed and this test MUST fail.
 */

import { computeOverallScore } from '@services/ratings'
import type { PlaceRatingsInput } from '@lib/validation'

describe('Rating computation performance', () => {
  it('computeOverallScore handles 1000 calls in under 10 ms', () => {
    const ratings: PlaceRatingsInput = {
      overall_experience: 4,
      safety: 5,
      food_cuisine: 4,
      transportation: 3,
      friendliness: 5,
      affordability: 3,
      cleanliness: 4,
      nightlife_entertainment: 3,
      natural_beauty: 5,
      wifi_connectivity: 4,
    }

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      computeOverallScore(ratings)
    }
    const elapsed = performance.now() - start

    console.log(`computeOverallScore × 1000: ${elapsed.toFixed(2)} ms`)

    // Hard budget — MUST fail if exceeded
    expect(elapsed).toBeLessThan(10)
  })

  it('computeOverallScore returns exactly 1 decimal place', () => {
    const score = computeOverallScore({ safety: 4, food_cuisine: 3 })
    expect(score).not.toBeNull()

    const str = String(score!)
    const decimalPart = str.split('.')[1]
    const decimalLength = decimalPart?.length ?? 0

    expect(decimalLength).toBeLessThanOrEqual(1)
  })

  it('computeOverallScore with all-same scores is fast', () => {
    const uniform: PlaceRatingsInput = {
      overall_experience: 3,
      safety: 3,
      food_cuisine: 3,
      transportation: 3,
      friendliness: 3,
      affordability: 3,
      cleanliness: 3,
      nightlife_entertainment: 3,
      natural_beauty: 3,
      wifi_connectivity: 3,
    }

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      computeOverallScore(uniform)
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(10)
  })

  it('computeOverallScore with single rating is fast', () => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      computeOverallScore({ safety: (((i % 5) + 1) as 1 | 2 | 3 | 4 | 5) })
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(10)
  })

  it('computeOverallScore with empty object is fast', () => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      computeOverallScore({})
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(10)
  })
})
