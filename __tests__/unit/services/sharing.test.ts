import { createClient } from '@supabase/supabase-js'
import { getShareCardData, saveShareCard } from '@services/sharing'
import { ApiError } from '@lib/apiErrors'

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function getMockStorage() {
  return mockSupabase.storage.from as jest.Mock
}

global.fetch = jest.fn().mockResolvedValue({
  blob: jest.fn().mockResolvedValue(new Blob(['fake-png'], { type: 'image/png' })),
})

function mockChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
  }
  ;(chain.eq as jest.Mock).mockReturnValue({ ...chain, eq: jest.fn().mockResolvedValue(finalResult) })
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getShareCardData
// ---------------------------------------------------------------------------

describe('getShareCardData', () => {
  it('returns correct shape with visited country codes, stats, and profile info', async () => {
    const profile = { display_name: 'Test User', avatar_url: null }
    const places = [
      { country_code: 'JP', overall_score: 4.5 },
      { country_code: 'FR', overall_score: 3.8 },
      { country_code: 'JP', overall_score: 4.0 }, // duplicate country — same country, different city
    ]

    const profileChain = mockChain({ data: profile, error: null })
    const placesChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    let eqCount = 0
    ;(placesChain.eq as jest.Mock).mockImplementation(() => {
      eqCount++
      if (eqCount >= 2) {
        return Promise.resolve({ data: places, error: null })
      }
      return placesChain
    })

    getMockFrom()
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(placesChain)

    const result = await getShareCardData('user-123')

    expect(result.displayName).toBe('Test User')
    expect(result.avatarUrl).toBeNull()
    expect(result.visitedCountryCodes).toContain('JP')
    expect(result.visitedCountryCodes).toContain('FR')
    // Unique countries: JP and FR = 2
    expect(result.stats.countriesVisited).toBe(2)
    // Total place entries: 3
    expect(result.stats.citiesVisited).toBe(3)
    // Average: (4.5 + 3.8 + 4.0) / 3 = 4.1
    expect(result.stats.averageRating).toBe(4.1)
  })

  it('returns null averageRating when no scores', async () => {
    const profile = { display_name: 'Test User', avatar_url: null }
    const places = [{ country_code: 'JP', overall_score: null }]

    const profileChain = mockChain({ data: profile, error: null })
    const placesChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    let eqCount = 0
    ;(placesChain.eq as jest.Mock).mockImplementation(() => {
      eqCount++
      if (eqCount >= 2) {
        return Promise.resolve({ data: places, error: null })
      }
      return placesChain
    })

    getMockFrom()
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(placesChain)

    const result = await getShareCardData('user-123')

    expect(result.stats.averageRating).toBeNull()
  })

  it('throws ApiError when profile fetch fails', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'forbidden' } }),
    )

    await expect(getShareCardData('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// saveShareCard
// ---------------------------------------------------------------------------

describe('saveShareCard', () => {
  it('uploads to share-cards/{userId}/{timestamp}_{random}.png path', async () => {
    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/share-card.png' },
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    await saveShareCard('user-123', 'file://card.png')

    expect(getMockStorage()).toHaveBeenCalledWith('share-cards')
    expect(mockStorageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^share-cards\/user-123\/\d+_[0-9a-f]{8}\.png$/),
      expect.any(Blob),
      expect.objectContaining({ contentType: 'image/png' }),
    )
  })

  it('returns the public URL', async () => {
    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/share-card.png' },
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    const url = await saveShareCard('user-123', 'file://card.png')

    expect(url).toBe('https://example.com/share-card.png')
  })

  it('throws ApiError when upload fails', async () => {
    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({
        error: { message: 'storage error', code: 'UNKNOWN' },
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    await expect(saveShareCard('user-123', 'file://card.png')).rejects.toBeInstanceOf(ApiError)
  })
})
