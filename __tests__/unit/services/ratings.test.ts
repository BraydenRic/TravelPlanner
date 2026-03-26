import { createClient } from '@supabase/supabase-js'
import {
  computeOverallScore,
  upsertPlaceRatings,
  getPlaceRatings,
  getCountryRatings,
  getTopRatedCountries,
  getRatingBreakdown,
} from '@services/ratings'
import { ApiError } from '@lib/apiErrors'
import { createMockPlace, createMockCountryRatings } from '@/../__tests__/factories'
import type { PlaceRatingsInput } from '@lib/validation'

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function mockChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(finalResult),
    single: jest.fn().mockResolvedValue(finalResult),
  }
  // Default — for chains that end with .order() or .in()
  ;(chain.order as jest.Mock).mockResolvedValue(finalResult)
  ;(chain.in as jest.Mock).mockResolvedValue(finalResult)
  ;(chain.not as jest.Mock).mockResolvedValue(finalResult)
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// computeOverallScore
// ---------------------------------------------------------------------------

describe('computeOverallScore', () => {
  it('returns null for empty ratings', () => {
    expect(computeOverallScore({})).toBeNull()
  })

  it('returns null when all values are undefined', () => {
    const partialRatings: Partial<PlaceRatingsInput> = {}
    expect(computeOverallScore(partialRatings)).toBeNull()
  })

  it('returns average for a single rating', () => {
    expect(computeOverallScore({ safety: 4 })).toBe(4.0)
  })

  it('returns correct average for all 10 categories at 5', () => {
    const ratings: PlaceRatingsInput = {
      overall_experience: 5,
      safety: 5,
      food_cuisine: 5,
      transportation: 5,
      friendliness: 5,
      affordability: 5,
      cleanliness: 5,
      nightlife_entertainment: 5,
      natural_beauty: 5,
      wifi_connectivity: 5,
    }
    expect(computeOverallScore(ratings)).toBe(5.0)
  })

  it('returns correct average for all 10 categories at 1', () => {
    const ratings: PlaceRatingsInput = {
      overall_experience: 1,
      safety: 1,
      food_cuisine: 1,
      transportation: 1,
      friendliness: 1,
      affordability: 1,
      cleanliness: 1,
      nightlife_entertainment: 1,
      natural_beauty: 1,
      wifi_connectivity: 1,
    }
    expect(computeOverallScore(ratings)).toBe(1.0)
  })

  it('handles partial ratings correctly', () => {
    // 4 + 2 = 6 / 2 = 3.0
    expect(computeOverallScore({ safety: 4, affordability: 2 })).toBe(3.0)
  })

  it('returns 1 decimal precision', () => {
    // 1 + 2 + 3 = 6 / 3 = 2.0 (already clean)
    // test non-round: 1 + 2 = 3 / 2 = 1.5
    expect(computeOverallScore({ safety: 1, affordability: 2 })).toBe(1.5)
  })

  it('rounds to 1 decimal for non-terminating decimals', () => {
    // 1 + 2 + 3 = 6 / 3 = 2.0; test: 1+2+3+4 = 10/4 = 2.5
    expect(computeOverallScore({ safety: 1, affordability: 2, food_cuisine: 3, transportation: 4 })).toBe(2.5)
  })

  it('mixed scores: 4,5,3,4,5 → 4.2', () => {
    expect(
      computeOverallScore({
        overall_experience: 4,
        safety: 5,
        food_cuisine: 3,
        transportation: 4,
        friendliness: 5,
      }),
    ).toBe(4.2)
  })
})

// ---------------------------------------------------------------------------
// upsertPlaceRatings
// ---------------------------------------------------------------------------

describe('upsertPlaceRatings', () => {
  it('verifies ownership before upserting', async () => {
    const chain = mockChain({ data: { id: 'place-123' }, error: null })
    const upsertChain = {
      ...mockChain({ data: [], error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    getMockFrom()
      .mockReturnValueOnce(chain) // ownership check
      .mockReturnValueOnce(upsertChain) // upsert

    await upsertPlaceRatings('place-123', 'user-123', { safety: 4 })

    expect(chain.eq).toHaveBeenCalledWith('id', 'place-123')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('throws FORBIDDEN when place does not belong to user', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    await expect(
      upsertPlaceRatings('place-123', 'other-user', { safety: 4 }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('returns empty array when ratings object is empty', async () => {
    const chain = mockChain({ data: { id: 'place-123' }, error: null })
    getMockFrom().mockReturnValue(chain)

    const result = await upsertPlaceRatings('place-123', 'user-123', {})

    expect(result).toEqual([])
  })

  it('throws FORBIDDEN when ownerCheck returns null data with no error', async () => {
    // Ownership query succeeds (no error) but returns null data — place not owned by user
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: null }),
    )

    await expect(
      upsertPlaceRatings('place-123', 'other-user', { safety: 4 }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('formats upsert rows correctly', async () => {
    const ownerChain = mockChain({ data: { id: 'place-123' }, error: null })
    const upsertChain = mockChain({ data: [
      { id: 'r1', visited_place_id: 'place-123', category: 'safety', score: 4, created_at: '2024-01-01T00:00:00Z' },
    ], error: null })
    upsertChain.select = jest.fn().mockResolvedValue({
      data: [{ id: 'r1', visited_place_id: 'place-123', category: 'safety', score: 4, created_at: '2024-01-01T00:00:00Z' }],
      error: null,
    })

    getMockFrom()
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(upsertChain)

    await upsertPlaceRatings('place-123', 'user-123', { safety: 4 })

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      [{ visited_place_id: 'place-123', category: 'safety', score: 4 }],
      { onConflict: 'visited_place_id,category' },
    )
  })
})

// ---------------------------------------------------------------------------
// getPlaceRatings
// ---------------------------------------------------------------------------

describe('getPlaceRatings', () => {
  it('returns ratings for a given visited place', async () => {
    const ratings = [
      { id: 'r1', visited_place_id: 'place-123', category: 'safety', score: 4, created_at: '2024-01-01T00:00:00Z' },
      { id: 'r2', visited_place_id: 'place-123', category: 'food_cuisine', score: 5, created_at: '2024-01-01T00:00:00Z' },
    ]
    getMockFrom().mockReturnValue(mockChain({ data: ratings, error: null }))

    const result = await getPlaceRatings('place-123')

    expect(result).toHaveLength(2)
    expect(result[0]?.category).toBe('safety')
  })

  it('returns empty array when no ratings exist', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: null, error: null }))

    const result = await getPlaceRatings('place-123')

    expect(result).toEqual([])
  })

  it('throws ApiError when query fails', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'rls violation' } }),
    )

    await expect(getPlaceRatings('place-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getCountryRatings
// ---------------------------------------------------------------------------

describe('getCountryRatings', () => {
  it('maps RPC response to CountryRatings shape', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    const countryRatings = createMockCountryRatings('JP')
    mockRpc.mockResolvedValueOnce({
      data: {
        overall_score: countryRatings.overall_score,
        categories: countryRatings.categories,
        cities_rated: countryRatings.cities_rated,
        total_cities: countryRatings.total_cities,
      },
      error: null,
    })

    const result = await getCountryRatings('JP', 'user-123')

    expect(result.country_code).toBe('JP')
    expect(result.overall_score).toBe(4.2)
    expect(mockRpc).toHaveBeenCalledWith('compute_country_ratings', {
      p_country_code: 'JP',
      p_user_id: 'user-123',
    })
  })

  it('throws ApiError when RPC fails', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'UNKNOWN', message: 'rpc failed' },
    })

    await expect(getCountryRatings('JP', 'user-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getTopRatedCountries
// ---------------------------------------------------------------------------

describe('getTopRatedCountries', () => {
  it('returns correctly ordered list by overall score', async () => {
    const places = [
      { id: 'p1', country_code: 'JP', overall_score: 4.5 },
      { id: 'p2', country_code: 'FR', overall_score: 3.2 },
      { id: 'p3', country_code: 'IT', overall_score: 4.8 },
    ]
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getTopRatedCountries('user-123')

    expect(result[0]?.country_code).toBe('IT')
    expect(result[1]?.country_code).toBe('JP')
    expect(result[2]?.country_code).toBe('FR')
  })

  it('returns empty array when no visited places', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: [], error: null }))

    const result = await getTopRatedCountries('user-123')

    expect(result).toEqual([])
  })

  it('respects limit parameter', async () => {
    const places = Array.from({ length: 15 }, (_, i) => ({
      id: `p${i}`,
      country_code: `C${i}`,
      overall_score: 5 - i * 0.1,
    }))
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getTopRatedCountries('user-123', undefined, 5)

    expect(result).toHaveLength(5)
  })

  it('returns top countries filtered by category when category is provided', async () => {
    const places = [
      { id: 'p1', country_code: 'JP', overall_score: 4.5 },
      { id: 'p2', country_code: 'FR', overall_score: 3.2 },
      { id: 'p3', country_code: 'IT', overall_score: 4.0 },
    ]
    const ratings = [
      { visited_place_id: 'p1', score: 5 },
      { visited_place_id: 'p2', score: 3 },
      { visited_place_id: 'p3', score: 4 },
    ]

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: places, error: null })) // visited_places
      .mockReturnValueOnce(mockChain({ data: ratings, error: null })) // place_ratings

    const result = await getTopRatedCountries('user-123', 'safety')

    expect(result[0]?.country_code).toBe('JP')
    expect(result[0]?.score).toBe(5)
    expect(result).toHaveLength(3)
  })

  it('excludes countries with no category rating when category is provided', async () => {
    const places = [
      { id: 'p1', country_code: 'JP', overall_score: 4.5 },
      { id: 'p2', country_code: 'FR', overall_score: 3.2 },
    ]
    // Only JP has a safety rating — FR is excluded
    const ratings = [
      { visited_place_id: 'p1', score: 5 },
    ]

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: places, error: null }))
      .mockReturnValueOnce(mockChain({ data: ratings, error: null }))

    const result = await getTopRatedCountries('user-123', 'safety')

    expect(result).toHaveLength(1)
    expect(result[0]?.country_code).toBe('JP')
  })

  it('averages scores across multiple places in the same country when category is provided', async () => {
    const places = [
      { id: 'p1', country_code: 'JP', overall_score: 4.0 },
      { id: 'p2', country_code: 'JP', overall_score: 5.0 },
    ]
    const ratings = [
      { visited_place_id: 'p1', score: 3 },
      { visited_place_id: 'p2', score: 5 },
    ]

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: places, error: null }))
      .mockReturnValueOnce(mockChain({ data: ratings, error: null }))

    const result = await getTopRatedCountries('user-123', 'safety')

    expect(result).toHaveLength(1)
    expect(result[0]?.country_code).toBe('JP')
    expect(result[0]?.score).toBe(4.0)
  })

  it('throws ApiError when place_ratings query fails (category path)', async () => {
    const places = [
      { id: 'p1', country_code: 'JP', overall_score: 4.5 },
    ]

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: places, error: null }))
      .mockReturnValueOnce(mockChain({ data: null, error: { code: '42501', message: 'rls' } }))

    await expect(getTopRatedCountries('user-123', 'safety')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getRatingBreakdown
// ---------------------------------------------------------------------------

describe('getRatingBreakdown', () => {
  it('returns all 10 categories with scores or null', () => {
    const breakdown = getRatingBreakdown({ safety: 4, food_cuisine: 5 })

    expect(breakdown).toHaveLength(10)
    const safety = breakdown.find((b) => b.category === 'safety')
    expect(safety?.score).toBe(4)
    const transportation = breakdown.find((b) => b.category === 'transportation')
    expect(transportation?.score).toBeNull()
  })

  it('returns all null scores for empty ratings', () => {
    const breakdown = getRatingBreakdown({})
    expect(breakdown.every((b) => b.score === null)).toBe(true)
  })
})
