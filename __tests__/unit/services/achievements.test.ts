import { createClient } from '@supabase/supabase-js'
import {
  checkAndUnlockAchievements,
  getUserAchievements,
  BADGE_METADATA,
} from '@services/achievements'
import { ApiError } from '@lib/apiErrors'
import { createMockAchievement } from '@/../__tests__/factories'
import type { BadgeType } from '@typedefs/database'

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
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
  }
  ;(chain.order as jest.Mock).mockResolvedValue(finalResult)
  ;(chain.in as jest.Mock).mockResolvedValue(finalResult)
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// BADGE_METADATA
// ---------------------------------------------------------------------------

describe('BADGE_METADATA', () => {
  const allBadgeTypes: BadgeType[] = [
    'first_stamp',
    'continental',
    'globe_trotter',
    'critic',
    'squad_goals',
    'home_away',
    'city_explorer',
  ]

  it('contains metadata for all 7 badge types', () => {
    allBadgeTypes.forEach((badgeType) => {
      expect(BADGE_METADATA[badgeType]).toBeDefined()
    })
  })

  it('each badge has label, description, and icon', () => {
    allBadgeTypes.forEach((badgeType) => {
      const meta = BADGE_METADATA[badgeType]
      expect(meta.label).toBeTruthy()
      expect(meta.description).toBeTruthy()
      expect(meta.icon).toBeTruthy()
    })
  })
})

// ---------------------------------------------------------------------------
// checkAndUnlockAchievements
// ---------------------------------------------------------------------------

describe('checkAndUnlockAchievements', () => {
  it('returns array of newly unlocked badge achievements', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({
      data: [
        { badge_type: 'first_stamp', newly_unlocked: true },
        { badge_type: 'continental', newly_unlocked: false },
      ],
      error: null,
    })

    const achievement = createMockAchievement({ badge_type: 'first_stamp' })
    getMockFrom().mockReturnValue(mockChain({ data: [achievement], error: null }))

    const result = await checkAndUnlockAchievements('user-123')

    expect(result).toHaveLength(1)
    expect(result[0]?.badge_type).toBe('first_stamp')
  })

  it('returns empty array when no new achievements', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({
      data: [{ badge_type: 'first_stamp', newly_unlocked: false }],
      error: null,
    })

    const result = await checkAndUnlockAchievements('user-123')

    expect(result).toEqual([])
  })

  it('throws ApiError when RPC fails', async () => {
    const mockRpc = mockSupabase.rpc as jest.Mock
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'UNKNOWN', message: 'rpc failed' },
    })

    await expect(checkAndUnlockAchievements('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getUserAchievements
// ---------------------------------------------------------------------------

describe('getUserAchievements', () => {
  it('returns all achievements for a user', async () => {
    const achievements = [
      createMockAchievement({ badge_type: 'first_stamp' }),
      createMockAchievement({ id: 'achievement-2', badge_type: 'continental' }),
    ]
    getMockFrom().mockReturnValue(mockChain({ data: achievements, error: null }))

    const result = await getUserAchievements('user-123')

    expect(result).toHaveLength(2)
  })

  it('returns empty array when user has no achievements', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: [], error: null }))

    const result = await getUserAchievements('user-123')

    expect(result).toEqual([])
  })

  it('throws ApiError on Supabase error', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'forbidden' } }),
    )

    await expect(getUserAchievements('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})
