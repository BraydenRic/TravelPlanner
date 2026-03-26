import { createClient } from '@supabase/supabase-js'
import {
  getPlaces,
  getPlace,
  getPlaceByCountryAndCity,
  createPlace,
  updatePlace,
  deletePlace,
  getPlacesByCountry,
  getFillIntensity,
} from '@services/places'
import { ApiError } from '@lib/apiErrors'
import { createMockPlace, createMockTravelStats } from '@/../__tests__/factories'

// ---------------------------------------------------------------------------
// Helpers — pull the mock supabase instance out of createClient
// ---------------------------------------------------------------------------

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  // If mock isn't initialised yet (module-level), call createClient to get it
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function mockChain(finalResult: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(finalResult)
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
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
    then: jest.fn((resolve, reject) => resolved.then(resolve, reject)),
  }
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getPlaces
// ---------------------------------------------------------------------------

describe('getPlaces', () => {
  it('returns first page with nextCursor when more items exist', async () => {
    const places = Array.from({ length: 21 }, (_, i) =>
      createMockPlace({ id: `place-${i}`, created_at: `2024-01-${String(21 - i).padStart(2, '0')}T00:00:00Z` }),
    )
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getPlaces('user-123', undefined, undefined, 20)

    expect(result.data).toHaveLength(20)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).not.toBeNull()
  })

  it('returns last page with null nextCursor', async () => {
    const places = [createMockPlace(), createMockPlace({ id: 'place-2' })]
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getPlaces('user-123', undefined, undefined, 20)

    expect(result.data).toHaveLength(2)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('filters by category when provided', async () => {
    const chain = mockChain({ data: [], error: null })
    getMockFrom().mockReturnValue(chain)

    await getPlaces('user-123', 'been')

    expect(chain.eq).toHaveBeenCalledWith('category', 'been')
  })

  it('uses cursor when provided', async () => {
    const chain = mockChain({ data: [], error: null })
    getMockFrom().mockReturnValue(chain)

    await getPlaces('user-123', undefined, '2024-01-01T00:00:00Z')

    expect(chain.lt).toHaveBeenCalledWith('created_at', '2024-01-01T00:00:00Z')
  })

  it('throws ApiError when Supabase returns an error', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'row-level security' } }),
    )

    await expect(getPlaces('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getPlace
// ---------------------------------------------------------------------------

describe('getPlace', () => {
  it('returns a single place by ID', async () => {
    const place = createMockPlace()
    getMockFrom().mockReturnValue(mockChain({ data: place, error: null }))

    const result = await getPlace('place-123')

    expect(result.id).toBe('place-123')
  })

  it('throws ApiError when place not found', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    await expect(getPlace('nonexistent')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getPlaceByCountryAndCity
// ---------------------------------------------------------------------------

describe('getPlaceByCountryAndCity', () => {
  it('returns null when no matching place exists', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: [], error: null }))

    const result = await getPlaceByCountryAndCity('user-123', 'JP', 'city-999')

    expect(result).toBeNull()
  })

  it('returns the matching place when found', async () => {
    const place = createMockPlace()
    getMockFrom().mockReturnValue(mockChain({ data: [place], error: null }))

    const result = await getPlaceByCountryAndCity('user-123', 'JP', 'city-123')

    expect(result).not.toBeNull()
    expect(result?.country_code).toBe('JP')
  })

  it('handles null cityId with is() query', async () => {
    const chain = mockChain({ data: [], error: null })
    getMockFrom().mockReturnValue(chain)

    await getPlaceByCountryAndCity('user-123', 'JP', null)

    expect(chain.is).toHaveBeenCalledWith('city_id', null)
  })
})

// ---------------------------------------------------------------------------
// createPlace
// ---------------------------------------------------------------------------

describe('createPlace', () => {
  it('creates a place and returns the new record', async () => {
    const place = createMockPlace()
    getMockFrom().mockReturnValue(mockChain({ data: place, error: null }))

    const result = await createPlace('user-123', {
      country_code: 'JP',
      category: 'been',
      visited_date: '2024-06-01T00:00:00.000Z',
    })

    expect(result.country_code).toBe('JP')
    expect(result.category).toBe('been')
  })

  it('strips XSS from review before storage', async () => {
    const place = createMockPlace({ review: 'Great place' })
    const chain = mockChain({ data: place, error: null })
    getMockFrom().mockReturnValue(chain)

    await createPlace('user-123', {
      country_code: 'JP',
      category: 'been',
      review: '<script>alert("xss")</script>Great place',
    })

    // Verify insert was called with sanitized content (no script tags)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        review: expect.not.stringContaining('<script>'),
      }),
    )
  })

  it('throws validation error for invalid country code', async () => {
    await expect(
      createPlace('user-123', {
        country_code: 'invalid',
        category: 'been',
      }),
    ).rejects.toThrow()
  })

  it('throws ApiError on Supabase error', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '23514', message: 'CHECK constraint failed' } }),
    )

    await expect(
      createPlace('user-123', { country_code: 'JP', category: 'been' }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// updatePlace
// ---------------------------------------------------------------------------

describe('updatePlace', () => {
  it('updates a place and returns updated record', async () => {
    const place = createMockPlace({ review: 'Updated review' })
    getMockFrom().mockReturnValue(mockChain({ data: place, error: null }))

    const result = await updatePlace('place-123', 'user-123', { review: 'Updated review' })

    expect(result.review).toBe('Updated review')
  })

  it('sanitizes review on update', async () => {
    const place = createMockPlace()
    const chain = mockChain({ data: place, error: null })
    getMockFrom().mockReturnValue(chain)

    await updatePlace('place-123', 'user-123', { review: '<b>Bold</b> text' })

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        review: expect.not.stringContaining('<b>'),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// deletePlace
// ---------------------------------------------------------------------------

describe('deletePlace', () => {
  it('deletes a place successfully', async () => {
    const chain = mockChain({ data: null, error: null })
    getMockFrom().mockReturnValue(chain)

    await expect(deletePlace('place-123', 'user-123')).resolves.toBeUndefined()

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'place-123')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('throws ApiError on Supabase error', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'forbidden' } }),
    )

    await expect(deletePlace('place-123', 'user-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getPlacesByCountry
// ---------------------------------------------------------------------------

describe('getPlacesByCountry', () => {
  it('returns all places for a country', async () => {
    const places = [createMockPlace(), createMockPlace({ id: 'place-2', city_id: 'city-456' })]
    getMockFrom().mockReturnValue(mockChain({ data: places, error: null }))

    const result = await getPlacesByCountry('user-123', 'JP')

    expect(result).toHaveLength(2)
  })

  it('throws validation error for invalid country code', async () => {
    await expect(getPlacesByCountry('user-123', 'us')).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// getFillIntensity
// ---------------------------------------------------------------------------

describe('getFillIntensity', () => {
  it('calls get_country_fill_intensity RPC and returns data', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({
      data: [{ country_code: 'JP', cities_visited: 3, total_cities: 10, fill_ratio: 0.3 }],
      error: null,
    })

    const result = await getFillIntensity('user-123')

    expect(mockRpc).toHaveBeenCalledWith('get_country_fill_intensity', { p_user_id: 'user-123' })
    expect(result).toHaveLength(1)
    expect(result[0]?.country_code).toBe('JP')
  })

  it('throws ApiError when RPC fails', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'UNKNOWN', message: 'rpc error' },
    })

    await expect(getFillIntensity('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})
