import { createClient } from '@supabase/supabase-js'
import {
  getTravelStats,
  getContinentProgress,
  getWorldExplorePercent,
} from '@services/stats'
import { ApiError } from '@lib/apiErrors'
import { createMockTravelStats } from '@/../__tests__/factories'

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function mockChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  }
  ;(chain.eq as jest.Mock).mockImplementation(function () {
    return {
      ...chain,
      // Make the final .eq() call resolve
      eq: jest.fn().mockResolvedValue(finalResult),
    }
  })
  return chain
}

function mockChainSimple(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
  }
  // Last eq call resolves
  ;(chain.eq as jest.Mock).mockReturnValue({ ...chain, eq: jest.fn().mockResolvedValue(finalResult) })
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getWorldExplorePercent
// ---------------------------------------------------------------------------

describe('getWorldExplorePercent', () => {
  it('returns 0% for 0 countries visited', () => {
    const stats = createMockTravelStats({ countries_visited: 0 })
    expect(getWorldExplorePercent(stats)).toBe(0)
  })

  it('returns 100% for 195 countries visited', () => {
    const stats = createMockTravelStats({ countries_visited: 195 })
    expect(getWorldExplorePercent(stats)).toBe(100)
  })

  it('returns approximately 50% for 97-98 countries', () => {
    const stats97 = createMockTravelStats({ countries_visited: 97 })
    const stats98 = createMockTravelStats({ countries_visited: 98 })
    expect(getWorldExplorePercent(stats97)).toBeCloseTo(49.7, 0)
    expect(getWorldExplorePercent(stats98)).toBeCloseTo(50.3, 0)
  })

  it('returns correct percentage for 15 countries (≈7.7%)', () => {
    const stats = createMockTravelStats({ countries_visited: 15 })
    // 15/195 * 100 = 7.692... → rounds to 7.7
    expect(getWorldExplorePercent(stats)).toBe(7.7)
  })
})

// ---------------------------------------------------------------------------
// getTravelStats
// ---------------------------------------------------------------------------

describe('getTravelStats', () => {
  it('calls get_travel_stats RPC and returns data', async () => {
    const stats = createMockTravelStats()
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({ data: stats, error: null })

    const result = await getTravelStats('user-123')

    expect(mockRpc).toHaveBeenCalledWith('get_travel_stats', { p_user_id: 'user-123' })
    expect(result.countries_visited).toBe(15)
  })

  it('throws ApiError when RPC fails', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'UNKNOWN', message: 'rpc error' },
    })

    await expect(getTravelStats('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getContinentProgress
// ---------------------------------------------------------------------------

describe('getContinentProgress', () => {
  it('correctly groups countries by continent', async () => {
    // JP = Asia, FR = Europe, US = North America
    const places = [
      { country_code: 'JP', category: 'been' },
      { country_code: 'FR', category: 'been' },
      { country_code: 'US', category: 'been' },
    ]

    // Build a proper chain that resolves at the end
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    // The second .eq() call should resolve
    let eqCallCount = 0
    ;(chain.eq as jest.Mock).mockImplementation(() => {
      eqCallCount++
      if (eqCallCount >= 2) {
        return Promise.resolve({ data: places, error: null })
      }
      return chain
    })
    getMockFrom().mockReturnValue(chain)

    const result = await getContinentProgress('user-123')

    const asia = result.find((c) => c.continent === 'Asia')
    const europe = result.find((c) => c.continent === 'Europe')
    const northAmerica = result.find((c) => c.continent === 'North America')

    expect(asia?.countriesVisited).toBe(1)
    expect(europe?.countriesVisited).toBe(1)
    expect(northAmerica?.countriesVisited).toBe(1)
  })

  it('returns zero visited count for unvisited continents', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    let eqCallCount = 0
    ;(chain.eq as jest.Mock).mockImplementation(() => {
      eqCallCount++
      if (eqCallCount >= 2) {
        return Promise.resolve({ data: [{ country_code: 'JP', category: 'been' }], error: null })
      }
      return chain
    })
    getMockFrom().mockReturnValue(chain)

    const result = await getContinentProgress('user-123')

    const southAmerica = result.find((c) => c.continent === 'South America')
    expect(southAmerica?.countriesVisited).toBe(0)
    expect(southAmerica?.percentage).toBe(0)
  })
})
