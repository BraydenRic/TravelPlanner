/**
 * Integration: full rating flow
 *
 * Tests the complete chain: places → ratings → country aggregation → achievements.
 * All Supabase calls are mocked; the test exercises real service logic end-to-end.
 */

import { createClient } from '@supabase/supabase-js'
import { createPlace } from '@services/places'
import { upsertPlaceRatings, computeOverallScore, getCountryRatings } from '@services/ratings'
import { checkAndUnlockAchievements } from '@services/achievements'
import {
  createMockPlace,
  createMockPlaceRating,
  createMockCountryRatings,
  createMockAchievement,
} from '@/../__tests__/factories'
import type { PlaceRatingsInput } from '@lib/validation'
import { ApiError } from '@lib/apiErrors'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockSupabase = (() => {
  const mockCreate = createClient as jest.Mock
  return mockCreate.mock.results[0]?.value ?? mockCreate('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function mockChain(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result)
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: jest.fn((resolve, reject) => resolved.then(resolve, reject)),
  }
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Happy path: full rating flow
// ---------------------------------------------------------------------------

describe('Rating flow — happy path', () => {
  it('creates a place, rates all 10 categories, returns correct overall score', async () => {
    const place = createMockPlace({ id: 'place-flow-1', country_code: 'JP' })

    // 1. createPlace
    getMockFrom().mockReturnValueOnce(mockChain({ data: place, error: null }))

    const created = await createPlace('user-123', {
      country_code: 'JP',
      category: 'been',
      visited_date: '2024-06-01T00:00:00.000Z',
    })
    expect(created.id).toBe('place-flow-1')

    // 2. upsertPlaceRatings — ownership check then upsert
    const allRatings: PlaceRatingsInput = {
      overall_experience: 4,
      safety: 5,
      food_cuisine: 5,
      transportation: 4,
      friendliness: 4,
      affordability: 3,
      cleanliness: 5,
      nightlife_entertainment: 3,
      natural_beauty: 4,
      wifi_connectivity: 5,
    }

    const ratingRows = Object.entries(allRatings).map(([category, score]) =>
      createMockPlaceRating({ category: category as keyof PlaceRatingsInput, score: score as 1|2|3|4|5, visited_place_id: 'place-flow-1' }),
    )

    // Ownership check returns the place
    getMockFrom().mockReturnValueOnce(mockChain({ data: { id: 'place-flow-1' }, error: null }))
    // Upsert chain — select at the end resolves with the rows
    const upsertChain = mockChain({ data: ratingRows, error: null })
    upsertChain.select = jest.fn().mockResolvedValue({ data: ratingRows, error: null })
    getMockFrom().mockReturnValueOnce(upsertChain)

    const upserted = await upsertPlaceRatings('place-flow-1', 'user-123', allRatings)
    expect(upserted).toHaveLength(10)

    // 3. computeOverallScore — pure client-side, no mock needed
    const score = computeOverallScore(allRatings)
    // (4+5+5+4+4+3+5+3+4+5) / 10 = 42/10 = 4.2
    expect(score).toBe(4.2)

    // 4. getCountryRatings returns aggregated data
    const countryRatings = createMockCountryRatings('JP', {
      overall_score: 4.2,
      cities_rated: 1,
      total_cities: 12,
    })
    ;(mockSupabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: {
        overall_score: countryRatings.overall_score,
        categories: countryRatings.categories,
        cities_rated: countryRatings.cities_rated,
        total_cities: countryRatings.total_cities,
      },
      error: null,
    })

    const country = await getCountryRatings('JP', 'user-123')
    expect(country.country_code).toBe('JP')
    expect(country.overall_score).toBe(4.2)
    expect(country.cities_rated).toBe(1)
  })

  it('after rating 5 cities in Japan, check_achievements unlocks city_explorer', async () => {
    // Mock check_achievements RPC returning city_explorer as newly unlocked
    ;(mockSupabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [{ badge_type: 'city_explorer', newly_unlocked: true }],
      error: null,
    })

    // Mock the subsequent fetch of achievement records
    const achievement = createMockAchievement({ badge_type: 'city_explorer' })
    getMockFrom().mockReturnValueOnce(
      mockChain({ data: [achievement], error: null }),
    )

    const newBadges = await checkAndUnlockAchievements('user-123')

    expect(newBadges).toHaveLength(1)
    expect(newBadges[0]?.badge_type).toBe('city_explorer')
  })
})

// ---------------------------------------------------------------------------
// Partial ratings: only 5 of 10 categories rated
// ---------------------------------------------------------------------------

describe('Rating flow — partial ratings', () => {
  it('computeOverallScore averages only the rated categories', () => {
    const partial: Partial<PlaceRatingsInput> = {
      safety: 5,
      food_cuisine: 4,
      transportation: 3,
      friendliness: 5,
      affordability: 2,
    }

    const score = computeOverallScore(partial)
    // (5+4+3+5+2) / 5 = 19/5 = 3.8
    expect(score).toBe(3.8)
  })

  it('upsertPlaceRatings only sends rows for rated categories', async () => {
    const partial: Partial<PlaceRatingsInput> = { safety: 5, food_cuisine: 4 }

    getMockFrom().mockReturnValueOnce(mockChain({ data: { id: 'place-partial' }, error: null }))

    const upsertChain = mockChain({ data: [], error: null })
    upsertChain.select = jest.fn().mockResolvedValue({
      data: [
        createMockPlaceRating({ category: 'safety', score: 5 }),
        createMockPlaceRating({ category: 'food_cuisine', score: 4 }),
      ],
      error: null,
    })
    getMockFrom().mockReturnValueOnce(upsertChain)

    const result = await upsertPlaceRatings('place-partial', 'user-123', partial)
    expect(result).toHaveLength(2)

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ category: 'safety', score: 5 }),
        expect.objectContaining({ category: 'food_cuisine', score: 4 }),
      ]),
      { onConflict: 'visited_place_id,category' },
    )
  })
})

// ---------------------------------------------------------------------------
// Update flow: re-rate 2 categories and verify score re-computes
// ---------------------------------------------------------------------------

describe('Rating flow — update', () => {
  it('re-rating 2 categories produces a new correct overall score', () => {
    // Original 5 ratings
    const original: Partial<PlaceRatingsInput> = {
      safety: 3,
      food_cuisine: 3,
      transportation: 3,
      friendliness: 3,
      affordability: 3,
    }
    expect(computeOverallScore(original)).toBe(3.0)

    // Update 2 categories to higher values
    const updated: Partial<PlaceRatingsInput> = {
      ...original,
      safety: 5,
      food_cuisine: 5,
    }
    // (5+5+3+3+3) / 5 = 19/5 = 3.8
    expect(computeOverallScore(updated)).toBe(3.8)
  })

  it('upsertPlaceRatings with updated scores calls upsert with new values', async () => {
    const updates: Partial<PlaceRatingsInput> = { safety: 5, food_cuisine: 5 }

    getMockFrom().mockReturnValueOnce(mockChain({ data: { id: 'place-update' }, error: null }))

    const upsertChain = mockChain({ data: [], error: null })
    upsertChain.select = jest.fn().mockResolvedValue({
      data: [
        createMockPlaceRating({ category: 'safety', score: 5 }),
        createMockPlaceRating({ category: 'food_cuisine', score: 5 }),
      ],
      error: null,
    })
    getMockFrom().mockReturnValueOnce(upsertChain)

    await upsertPlaceRatings('place-update', 'user-123', updates)

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ category: 'safety', score: 5 }),
        expect.objectContaining({ category: 'food_cuisine', score: 5 }),
      ]),
      expect.any(Object),
    )
  })
})

// ---------------------------------------------------------------------------
// getCountryRatings — error handling
// ---------------------------------------------------------------------------

describe('Rating flow — getCountryRatings error handling', () => {
  it('throws ApiError when RPC returns an error', async () => {
    ;(mockSupabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { code: 'UNKNOWN', message: 'compute_country_ratings failed' },
    })

    await expect(getCountryRatings('JP', 'user-123')).rejects.toBeInstanceOf(ApiError)
  })
})
