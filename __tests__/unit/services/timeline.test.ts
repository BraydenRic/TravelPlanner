import { createClient } from '@supabase/supabase-js'
import { getTimeline } from '@services/timeline'
import { ApiError } from '@lib/apiErrors'
import { createMockPhoto } from '@/../__tests__/factories'

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

// A chain that terminates via .limit()
function mockPlacesChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(finalResult),
  }
  return chain
}

// A chain that terminates via .order() (photos query)
function mockPhotosChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(finalResult),
  }
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getTimeline
// ---------------------------------------------------------------------------

describe('getTimeline', () => {
  it('returns entries in chronological order (newest first)', async () => {
    const places = [
      {
        id: 'p1',
        country_code: 'JP',
        city_id: 'city-1',
        category: 'been',
        visited_date: '2024-06-15',
        overall_score: 4.5,
        review: null,
        created_at: '2024-06-16T00:00:00Z',
        cities: { name: 'Tokyo' },
      },
      {
        id: 'p2',
        country_code: 'FR',
        city_id: 'city-2',
        category: 'been',
        visited_date: '2024-03-10',
        overall_score: 4.0,
        review: 'Great city',
        created_at: '2024-03-11T00:00:00Z',
        cities: { name: 'Paris' },
      },
    ]

    getMockFrom()
      .mockReturnValueOnce(mockPlacesChain({ data: places, error: null }))
      .mockReturnValueOnce(mockPhotosChain({ data: [], error: null }))

    const result = await getTimeline('user-123')

    expect(result.data[0]?.city_name).toBe('Tokyo')
    expect(result.data[1]?.city_name).toBe('Paris')
  })

  it('includes photos in timeline entries', async () => {
    const places = [
      {
        id: 'place-123',
        country_code: 'JP',
        city_id: 'city-1',
        category: 'been',
        visited_date: '2024-06-15',
        overall_score: 4.5,
        review: null,
        created_at: '2024-06-16T00:00:00Z',
        cities: { name: 'Tokyo' },
      },
    ]
    const photos = [
      createMockPhoto({ visited_place_id: 'place-123', sort_order: 0 }),
      createMockPhoto({ id: 'photo-2', visited_place_id: 'place-123', sort_order: 1 }),
    ]

    getMockFrom()
      .mockReturnValueOnce(mockPlacesChain({ data: places, error: null }))
      .mockReturnValueOnce(mockPhotosChain({ data: photos, error: null }))

    const result = await getTimeline('user-123')

    expect(result.data[0]?.photos).toHaveLength(2)
  })

  it('pagination cursor works correctly', async () => {
    const places = Array.from({ length: 21 }, (_, i) => ({
      id: `p${i}`,
      country_code: 'JP',
      city_id: null,
      category: 'been',
      visited_date: `2024-${String(12 - i).padStart(2, '0')}-01`,
      overall_score: 4.0,
      review: null,
      created_at: `2024-${String(12 - i).padStart(2, '0')}-01T00:00:00Z`,
      cities: null,
    }))

    getMockFrom()
      .mockReturnValueOnce(mockPlacesChain({ data: places, error: null }))
      .mockReturnValueOnce(mockPhotosChain({ data: [], error: null }))

    const result = await getTimeline('user-123', undefined, 20)

    expect(result.data).toHaveLength(20)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).not.toBeNull()
  })

  it('returns empty data when no visits', async () => {
    getMockFrom()
      .mockReturnValueOnce(mockPlacesChain({ data: [], error: null }))

    const result = await getTimeline('user-123')

    expect(result.data).toEqual([])
    expect(result.nextCursor).toBeNull()
    expect(result.hasMore).toBe(false)
  })

  it('throws ApiError when Supabase returns an error', async () => {
    getMockFrom().mockReturnValue(
      mockPlacesChain({ data: null, error: { code: '42501', message: 'forbidden' } }),
    )

    await expect(getTimeline('user-123')).rejects.toBeInstanceOf(ApiError)
  })

  it('handles null city gracefully', async () => {
    const places = [
      {
        id: 'p1',
        country_code: 'JP',
        city_id: null,
        category: 'been',
        visited_date: '2024-06-15',
        overall_score: null,
        review: null,
        created_at: '2024-06-16T00:00:00Z',
        cities: null,
      },
    ]

    getMockFrom()
      .mockReturnValueOnce(mockPlacesChain({ data: places, error: null }))
      .mockReturnValueOnce(mockPhotosChain({ data: [], error: null }))

    const result = await getTimeline('user-123')

    expect(result.data[0]?.city_name).toBeNull()
    expect(result.data[0]?.city_id).toBeNull()
  })
})
