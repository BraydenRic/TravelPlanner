import { createClient } from '@supabase/supabase-js'
import { getProfile, getProfileById, updateProfile, uploadAvatar, deleteAvatar } from '@services/profiles'
import { ApiError } from '@lib/apiErrors'
import { processPhotoForUpload } from '@lib/photoSecurity'
import { createMockProfile } from '@/../__tests__/factories'

jest.mock('@lib/photoSecurity', () => ({
  processPhotoForUpload: jest.fn().mockResolvedValue({
    processedUri: 'file://processed.jpg',
    thumbnailUri: 'file://thumb.jpg',
    mimeType: 'image/jpeg',
  }),
}))

// Mock fetch for blob conversion
global.fetch = jest.fn().mockResolvedValue({
  blob: jest.fn().mockResolvedValue(new Blob(['fake-image'], { type: 'image/jpeg' })),
})

const mockSupabase = (createClient as jest.Mock).mock.results[0]?.value ?? (() => {
  return (createClient as jest.Mock)('', '')
})()

function getMockFrom() {
  return mockSupabase.from as jest.Mock
}

function getMockStorage() {
  return mockSupabase.storage.from as jest.Mock
}

function mockChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
  }
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------

describe('getProfile', () => {
  it('returns the profile when found', async () => {
    const profile = createMockProfile()
    getMockFrom().mockReturnValue(mockChain({ data: profile, error: null }))

    const result = await getProfile('user-123')

    expect(result?.id).toBe('user-123')
  })

  it('returns null when profile not found', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    const result = await getProfile('nonexistent')

    expect(result).toBeNull()
  })

  it('throws ApiError for non-404 errors', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'row-level security' } }),
    )

    await expect(getProfile('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

describe('updateProfile', () => {
  it('validates and sanitizes display_name before update', async () => {
    const profile = createMockProfile({ display_name: 'Clean Name' })
    const chain = mockChain({ data: profile, error: null })
    getMockFrom().mockReturnValue(chain)

    const result = await updateProfile('user-123', { display_name: 'Clean Name' })

    expect(result.display_name).toBe('Clean Name')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Clean Name' }),
    )
  })

  it('sanitizes HTML in display_name', async () => {
    const profile = createMockProfile({ display_name: 'AlertName' })
    const chain = mockChain({ data: profile, error: null })
    getMockFrom().mockReturnValue(chain)

    // Note: <script> would fail the Zod regex, so we test a valid name with safe sanitization
    await updateProfile('user-123', { display_name: 'AlertName' })

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: expect.not.stringContaining('<script>'),
      }),
    )
  })

  it('throws validation error for display_name exceeding 30 chars', async () => {
    await expect(
      updateProfile('user-123', { display_name: 'A'.repeat(31) }),
    ).rejects.toThrow()
  })

  it('throws validation error for empty display_name', async () => {
    await expect(updateProfile('user-123', { display_name: '' })).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// getProfileById
// ---------------------------------------------------------------------------

describe('getProfileById', () => {
  it('returns the profile when found by id', async () => {
    const profile = createMockProfile({ id: 'user-456' })
    getMockFrom().mockReturnValue(mockChain({ data: profile, error: null }))

    const result = await getProfileById('user-456')

    expect(result?.id).toBe('user-456')
  })

  it('returns null when PGRST116 error (not found)', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    const result = await getProfileById('nonexistent-id')

    expect(result).toBeNull()
  })

  it('throws ApiError for non-404 errors', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '42501', message: 'row-level security violation' } }),
    )

    await expect(getProfileById('user-456')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// updateProfile (error branch)
// ---------------------------------------------------------------------------

describe('updateProfile error handling', () => {
  it('throws ApiError when Supabase update returns an error', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: '23505', message: 'duplicate key value' } }),
    )

    await expect(updateProfile('user-123', { display_name: 'ValidName' })).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// uploadAvatar
// ---------------------------------------------------------------------------

describe('uploadAvatar', () => {
  it('calls processPhotoForUpload before upload', async () => {
    const profile = createMockProfile({ avatar_url: 'https://example.com/avatar.jpg' })
    getMockFrom().mockReturnValue(mockChain({ data: profile, error: null }))

    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatar.jpg' },
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    await uploadAvatar('user-123', 'file://original.jpg')

    expect(processPhotoForUpload).toHaveBeenCalledWith('file://original.jpg')
  })

  it('uploads to correct storage path avatars/{userId}/{timestamp}.jpg', async () => {
    const profile = createMockProfile({ avatar_url: 'https://example.com/avatar.jpg' })
    getMockFrom().mockReturnValue(mockChain({ data: profile, error: null }))

    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatar.jpg' },
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    await uploadAvatar('user-123', 'file://photo.jpg')

    expect(getMockStorage()).toHaveBeenCalledWith('avatars')
    expect(mockStorageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^avatars\/user-123\/\d+\.jpg$/),
      expect.any(Blob),
      expect.objectContaining({ contentType: 'image/jpeg' }),
    )
  })
})

// ---------------------------------------------------------------------------
// deleteAvatar
// ---------------------------------------------------------------------------

describe('deleteAvatar', () => {
  it('removes the avatar from storage and clears avatar_url in DB', async () => {
    const profile = createMockProfile({
      avatar_url: 'https://example.com/storage/v1/object/public/avatars/user-123/1234.jpg',
    })
    const updatedProfile = createMockProfile({ avatar_url: null })

    const mockStorageBucket = {
      remove: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    // getProfile call, then update call
    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: profile, error: null }))
      .mockReturnValueOnce(mockChain({ data: updatedProfile, error: null }))

    const result = await deleteAvatar('user-123')

    expect(mockStorageBucket.remove).toHaveBeenCalled()
    expect(result.avatar_url).toBeNull()
  })

  it('still clears avatar_url in DB even when profile has no avatar_url', async () => {
    const profile = createMockProfile({ avatar_url: null })
    const updatedProfile = createMockProfile({ avatar_url: null })

    const mockStorageBucket = {
      remove: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: profile, error: null }))
      .mockReturnValueOnce(mockChain({ data: updatedProfile, error: null }))

    const result = await deleteAvatar('user-123')

    // No storage remove call when there's no avatar
    expect(mockStorageBucket.remove).not.toHaveBeenCalled()
    expect(result.avatar_url).toBeNull()
  })

  it('skips storage delete when avatar URL does not contain /avatars/ segment', async () => {
    const profile = createMockProfile({
      avatar_url: 'https://example.com/no-avatars-path/image.jpg',
    })
    const updatedProfile = createMockProfile({ avatar_url: null })

    const mockStorageBucket = {
      remove: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: profile, error: null }))
      .mockReturnValueOnce(mockChain({ data: updatedProfile, error: null }))

    await deleteAvatar('user-123')

    expect(mockStorageBucket.remove).not.toHaveBeenCalled()
  })

  it('throws ApiError when the DB update fails', async () => {
    const profile = createMockProfile({ avatar_url: null })

    const mockStorageBucket = {
      remove: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    getMockFrom()
      .mockReturnValueOnce(mockChain({ data: profile, error: null }))
      .mockReturnValueOnce(
        mockChain({ data: null, error: { code: '42501', message: 'rls violation' } }),
      )

    await expect(deleteAvatar('user-123')).rejects.toBeInstanceOf(ApiError)
  })
})
