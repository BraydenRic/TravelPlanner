import { createClient } from '@supabase/supabase-js'
import {
  registerPushToken,
  updateNotificationPreference,
  getPushToken,
} from '@services/notifications'
import { ApiError } from '@lib/apiErrors'

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
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
  }
  return chain
}

const mockPushToken = {
  id: 'token-123',
  user_id: 'user-123',
  expo_push_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  device_type: 'ios' as const,
  enabled: true,
  created_at: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// registerPushToken
// ---------------------------------------------------------------------------

describe('registerPushToken', () => {
  it('validates token and inserts correctly', async () => {
    const chain = mockChain({ data: mockPushToken, error: null })
    getMockFrom().mockReturnValue(chain)

    const result = await registerPushToken(
      'user-123',
      'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      'ios',
    )

    expect(result.expo_push_token).toBe('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')
    expect(result.device_type).toBe('ios')
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        expo_push_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        device_type: 'ios',
        enabled: true,
      }),
      { onConflict: 'user_id' },
    )
  })

  it('throws validation error for empty token', async () => {
    await expect(registerPushToken('user-123', '', 'ios')).rejects.toThrow()
  })

  it('throws validation error for token exceeding 200 chars', async () => {
    await expect(
      registerPushToken('user-123', 'a'.repeat(201), 'ios'),
    ).rejects.toThrow()
  })

  it('throws ApiError on Supabase error', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '23505', message: 'unique violation' } }),
    )

    await expect(
      registerPushToken('user-123', 'ExponentPushToken[abc]', 'android'),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// updateNotificationPreference
// ---------------------------------------------------------------------------

describe('updateNotificationPreference', () => {
  it('updates enabled flag to false', async () => {
    const chain = mockChain({ data: { ...mockPushToken, enabled: false }, error: null })
    getMockFrom().mockReturnValue(chain)

    const result = await updateNotificationPreference('user-123', false)

    expect(result.enabled).toBe(false)
    expect(chain.update).toHaveBeenCalledWith({ enabled: false })
  })

  it('updates enabled flag to true', async () => {
    const chain = mockChain({ data: { ...mockPushToken, enabled: true }, error: null })
    getMockFrom().mockReturnValue(chain)

    const result = await updateNotificationPreference('user-123', true)

    expect(result.enabled).toBe(true)
  })

  it('throws ApiError when token not found', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    await expect(updateNotificationPreference('user-123', false)).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// getPushToken
// ---------------------------------------------------------------------------

describe('getPushToken', () => {
  it('returns the push token', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: mockPushToken, error: null }))

    const result = await getPushToken('user-123')

    expect(result?.expo_push_token).toBe('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')
  })

  it('returns null when no token registered', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    const result = await getPushToken('user-123')

    expect(result).toBeNull()
  })
})
