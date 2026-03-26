import { createClient } from '@supabase/supabase-js'
import { uploadPhoto, getPlacePhotos, deletePhoto, getPhotoUrl, reorderPhotos } from '@services/photos'
import { ApiError } from '@lib/apiErrors'
import { processPhotoForUpload } from '@lib/photoSecurity'
import { createMockPhoto } from '@/../__tests__/factories'

jest.mock('@lib/photoSecurity', () => ({
  processPhotoForUpload: jest.fn().mockResolvedValue({
    processedUri: 'file://processed.jpg',
    thumbnailUri: 'file://thumb.jpg',
    mimeType: 'image/jpeg',
  }),
}))

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
// uploadPhoto
// ---------------------------------------------------------------------------

describe('uploadPhoto', () => {
  it('processes photo through security pipeline before upload', async () => {
    const photo = createMockPhoto()
    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)
    getMockFrom().mockReturnValue(mockChain({ data: photo, error: null }))

    await uploadPhoto('user-123', 'place-123', 'file://photo.jpg')

    expect(processPhotoForUpload).toHaveBeenCalledWith('file://photo.jpg')
  })

  it('uses correct storage path format', async () => {
    const photo = createMockPhoto()
    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)
    getMockFrom().mockReturnValue(mockChain({ data: photo, error: null }))

    await uploadPhoto('user-123', 'place-123', 'file://photo.jpg')

    const uploadCalls = mockStorageBucket.upload.mock.calls
    expect(uploadCalls[0]?.[0]).toMatch(/^user-123\/place-123\/\d+\.jpg$/)
    expect(uploadCalls[1]?.[0]).toMatch(/^user-123\/place-123\/thumb_\d+\.jpg$/)
  })

  it('throws when main photo upload to storage fails', async () => {
    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({
        error: { message: 'storage quota exceeded', code: 'UNKNOWN' },
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    await expect(
      uploadPhoto('user-123', 'place-123', 'file://photo.jpg'),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('throws when thumbnail upload to storage fails', async () => {
    const mockStorageBucket = {
      upload: jest.fn()
        .mockResolvedValueOnce({ error: null }) // main upload succeeds
        .mockResolvedValueOnce({ error: { message: 'storage error', code: 'UNKNOWN' } }), // thumb fails
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    await expect(
      uploadPhoto('user-123', 'place-123', 'file://photo.jpg'),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('sanitizes caption before creating DB record', async () => {
    const photo = createMockPhoto({ caption: 'Nice photo' })
    const mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)
    const chain = mockChain({ data: photo, error: null })
    getMockFrom().mockReturnValue(chain)

    await uploadPhoto('user-123', 'place-123', 'file://photo.jpg', '<b>Nice</b> photo')

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        caption: expect.not.stringContaining('<b>'),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// getPlacePhotos
// ---------------------------------------------------------------------------

describe('getPlacePhotos', () => {
  it('returns photos ordered by sort_order', async () => {
    const photos = [
      createMockPhoto({ sort_order: 0 }),
      createMockPhoto({ id: 'photo-2', sort_order: 1 }),
    ]
    const chain = mockChain({ data: photos, error: null })
    getMockFrom().mockReturnValue(chain)

    const result = await getPlacePhotos('place-123')

    expect(result).toHaveLength(2)
    expect(chain.order).toHaveBeenCalledWith('sort_order')
  })

  it('returns empty array when no photos', async () => {
    getMockFrom().mockReturnValue(mockChain({ data: [], error: null }))

    const result = await getPlacePhotos('place-123')

    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getPhotoUrl
// ---------------------------------------------------------------------------

describe('getPhotoUrl', () => {
  it('returns a signed URL with 60 min expiry', async () => {
    const mockStorageBucket = {
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed?token=abc' },
        error: null,
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    const url = await getPhotoUrl('place-photos/user-123/place-123/123.jpg')

    expect(url).toBe('https://example.com/signed?token=abc')
    expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
      'place-photos/user-123/place-123/123.jpg',
      3600,
    )
  })

  it('throws ApiError when signed URL creation fails', async () => {
    const mockStorageBucket = {
      createSignedUrl: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'storage error', code: 'UNKNOWN' },
      }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    await expect(getPhotoUrl('some/path.jpg')).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// deletePhoto
// ---------------------------------------------------------------------------

describe('deletePhoto', () => {
  it('verifies ownership before deleting', async () => {
    const photo = createMockPhoto()
    const fetchChain = mockChain({ data: photo, error: null })
    const deleteChain = mockChain({ data: null, error: null })
    const mockStorageBucket = {
      remove: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    getMockFrom()
      .mockReturnValueOnce(fetchChain) // ownership check
      .mockReturnValueOnce(deleteChain) // delete

    await deletePhoto('photo-123', 'user-123')

    expect(fetchChain.eq).toHaveBeenCalledWith('id', 'photo-123')
    expect(fetchChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('throws FORBIDDEN when photo not owned by user', async () => {
    getMockFrom().mockReturnValue(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    await expect(deletePhoto('photo-123', 'other-user')).rejects.toBeInstanceOf(ApiError)
  })

  it('removes both main photo and thumbnail from storage', async () => {
    const photo = createMockPhoto({
      storage_path: 'place-photos/user-123/place-123/123.jpg',
      thumbnail_path: 'place-photos/user-123/place-123/thumb_123.jpg',
    })
    const fetchChain = mockChain({ data: photo, error: null })
    const deleteChain = mockChain({ data: null, error: null })
    const mockStorageBucket = {
      remove: jest.fn().mockResolvedValue({ error: null }),
    }
    getMockStorage().mockReturnValue(mockStorageBucket)

    getMockFrom()
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(deleteChain)

    await deletePhoto('photo-123', 'user-123')

    expect(mockStorageBucket.remove).toHaveBeenCalledWith([
      'place-photos/user-123/place-123/123.jpg',
      'place-photos/user-123/place-123/thumb_123.jpg',
    ])
  })
})

// ---------------------------------------------------------------------------
// reorderPhotos
// ---------------------------------------------------------------------------

describe('reorderPhotos', () => {
  it('updates sort_order for each photo in the list', async () => {
    const chain1 = mockChain({ data: null, error: null })
    const chain2 = mockChain({ data: null, error: null })

    getMockFrom()
      .mockReturnValueOnce(chain1)
      .mockReturnValueOnce(chain2)

    await reorderPhotos(
      [
        { id: 'photo-1', sort_order: 0 },
        { id: 'photo-2', sort_order: 1 },
      ],
      'user-123',
    )

    expect(chain1.update).toHaveBeenCalledWith({ sort_order: 0 })
    expect(chain2.update).toHaveBeenCalledWith({ sort_order: 1 })
  })

  it('scopes each update to the owning user', async () => {
    const chain = mockChain({ data: null, error: null })
    getMockFrom().mockReturnValue(chain)

    await reorderPhotos([{ id: 'photo-1', sort_order: 0 }], 'user-123')

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('resolves immediately for an empty photos array', async () => {
    await expect(reorderPhotos([], 'user-123')).resolves.toBeUndefined()
  })

  it('throws ApiError when a Supabase update fails', async () => {
    const chain = mockChain({ data: null, error: { code: '42501', message: 'rls' } })
    getMockFrom().mockReturnValue(chain)

    await expect(
      reorderPhotos([{ id: 'photo-1', sort_order: 0 }], 'user-123'),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
