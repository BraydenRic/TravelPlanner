/**
 * Integration: photo upload security flow
 *
 * Tests the full pipeline: processPhotoForUpload → storage upload →
 * DB record creation → signed URL retrieval → deletePhoto.
 *
 * Mocks: expo-image-manipulator, expo-file-system, Supabase (storage + DB).
 * Verifies storage path format exactly.
 */

import { createClient } from '@supabase/supabase-js'
import { uploadPhoto, getPhotoUrl, deletePhoto } from '@services/photos'
import { processPhotoForUpload } from '@lib/photoSecurity'
import { ApiError } from '@lib/apiErrors'
import { createMockPhoto } from '@/../__tests__/factories'

// ---------------------------------------------------------------------------
// Additional mocks (on top of jest.setup global mocks)
// ---------------------------------------------------------------------------

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 500 * 1024 }), // 500 KB — under limit
  readAsStringAsync: jest.fn().mockResolvedValue(
    // Base64 for JPEG magic bytes: FF D8 FF + 9 padding zeros
    Buffer.from([0xFF, 0xD8, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]).toString('base64'),
  ),
  EncodingType: { Base64: 'base64' },
}))

// expo-image-manipulator already mocked in jest.setup.ts:
//   manipulateAsync → { uri: 'mock-processed-uri' }
// We re-use that here.

// ---------------------------------------------------------------------------
// Supabase mock setup
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

function mockStorageBucket(overrides: Partial<ReturnType<typeof buildStorageBucket>> = {}) {
  const bucket = buildStorageBucket()
  const merged = { ...bucket, ...overrides }
  ;(mockSupabase.storage.from as jest.Mock).mockReturnValue(merged)
  return merged
}

function buildStorageBucket() {
  return {
    upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
    download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock.url/photo.jpg' } }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://mock.url/signed-photo.jpg' },
      error: null,
    }),
  }
}

// Mock fetch for blob conversion inside uploadPhoto
global.fetch = jest.fn().mockResolvedValue({
  blob: jest.fn().mockResolvedValue(new Blob(['mock-image-data'], { type: 'image/jpeg' })),
} as unknown as Response)

beforeEach(() => {
  jest.clearAllMocks()
  // Reset fetch mock
  ;(global.fetch as jest.Mock).mockResolvedValue({
    blob: jest.fn().mockResolvedValue(new Blob(['mock-image-data'], { type: 'image/jpeg' })),
  })
})

// ---------------------------------------------------------------------------
// 1. processPhotoForUpload pipeline
// ---------------------------------------------------------------------------

describe('Photo flow — processPhotoForUpload', () => {
  it('strips EXIF and compresses the image (returns processed and thumbnail URIs)', async () => {
    const { manipulateAsync } = require('expo-image-manipulator')
    manipulateAsync
      .mockResolvedValueOnce({ uri: 'stripped-exif.jpg' }) // stripExifData
      .mockResolvedValueOnce({ uri: 'compressed.jpg' })    // compressForUpload
      .mockResolvedValueOnce({ uri: 'thumbnail.jpg' })     // createThumbnail

    const { processedUri, thumbnailUri, mimeType } = await processPhotoForUpload('original.jpg')

    expect(processedUri).toBe('compressed.jpg')
    expect(thumbnailUri).toBe('thumbnail.jpg')
    expect(mimeType).toBe('image/jpeg')
    // manipulateAsync must have been called at least 3 times (strip + compress + thumbnail)
    expect(manipulateAsync).toHaveBeenCalledTimes(3)
  })
})

// ---------------------------------------------------------------------------
// 2. Storage path format
// ---------------------------------------------------------------------------

describe('Photo flow — storage path format', () => {
  it('uploads to place-photos/{userId}/{visitedPlaceId}/{ts}.jpg', async () => {
    const { manipulateAsync } = require('expo-image-manipulator')
    manipulateAsync
      .mockResolvedValueOnce({ uri: 'stripped.jpg' })
      .mockResolvedValueOnce({ uri: 'compressed.jpg' })
      .mockResolvedValueOnce({ uri: 'thumb.jpg' })

    const storageBucket = mockStorageBucket()
    const photo = createMockPhoto({ id: 'photo-new', user_id: 'user-123', visited_place_id: 'place-123' })

    const dbChain = mockChain({ data: photo, error: null })
    dbChain.select = jest.fn().mockReturnThis()
    dbChain.single = jest.fn().mockResolvedValue({ data: photo, error: null })
    getMockFrom().mockReturnValueOnce(dbChain)

    await uploadPhoto('user-123', 'place-123', 'original.jpg')

    // First upload call is the main photo
    const mainUploadPath = (storageBucket.upload as jest.Mock).mock.calls[0]?.[0] as string
    expect(mainUploadPath).toMatch(/^user-123\/place-123\/\d+\.jpg$/)

    // Second upload call is the thumbnail
    const thumbUploadPath = (storageBucket.upload as jest.Mock).mock.calls[1]?.[0] as string
    expect(thumbUploadPath).toMatch(/^user-123\/place-123\/thumb_\d+\.jpg$/)
  })

  it('thumbnail path uses thumb_ prefix with same timestamp as main photo', async () => {
    const { manipulateAsync } = require('expo-image-manipulator')
    manipulateAsync
      .mockResolvedValue({ uri: 'processed.jpg' })

    const storageBucket = mockStorageBucket()
    const photo = createMockPhoto()
    const dbChain = mockChain({ data: photo, error: null })
    dbChain.select = jest.fn().mockReturnThis()
    dbChain.single = jest.fn().mockResolvedValue({ data: photo, error: null })
    getMockFrom().mockReturnValueOnce(dbChain)

    await uploadPhoto('user-123', 'place-123', 'original.jpg')

    const calls = (storageBucket.upload as jest.Mock).mock.calls
    const mainPath = calls[0]?.[0] as string
    const thumbPath = calls[1]?.[0] as string

    // Extract timestamps
    const mainTs = mainPath.match(/\/(\d+)\.jpg$/)?.[1]
    const thumbTs = thumbPath.match(/thumb_(\d+)\.jpg$/)?.[1]

    expect(mainTs).toBeDefined()
    expect(thumbTs).toBeDefined()
    expect(mainTs).toBe(thumbTs)
  })
})

// ---------------------------------------------------------------------------
// 3. place_photos DB row is created
// ---------------------------------------------------------------------------

describe('Photo flow — DB record', () => {
  it('inserts a place_photos row with correct paths', async () => {
    const { manipulateAsync } = require('expo-image-manipulator')
    manipulateAsync.mockResolvedValue({ uri: 'processed.jpg' })

    mockStorageBucket()

    const photo = createMockPhoto({ caption: 'Nice view' })
    const dbChain = mockChain({ data: photo, error: null })
    dbChain.select = jest.fn().mockReturnThis()
    dbChain.single = jest.fn().mockResolvedValue({ data: photo, error: null })
    getMockFrom().mockReturnValueOnce(dbChain)

    const result = await uploadPhoto('user-123', 'place-123', 'original.jpg', 'Nice view')

    expect(result.id).toBe('photo-123')
    expect(dbChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        visited_place_id: 'place-123',
        user_id: 'user-123',
        storage_path: expect.stringMatching(/^user-123\//),
        thumbnail_path: expect.stringMatching(/thumb_/),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// 4. getPhotoUrl returns signed URL
// ---------------------------------------------------------------------------

describe('Photo flow — getPhotoUrl', () => {
  it('returns a signed URL from Supabase storage', async () => {
    const storageBucket = mockStorageBucket()

    const url = await getPhotoUrl('place-photos/user-123/place-123/1234567890.jpg')

    expect(url).toBe('https://mock.url/signed-photo.jpg')
    expect(storageBucket.createSignedUrl).toHaveBeenCalledWith(
      'place-photos/user-123/place-123/1234567890.jpg',
      3600,
    )
  })

  it('throws ApiError when signed URL generation fails', async () => {
    const storageBucket = mockStorageBucket({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'StorageError', message: 'bucket not found' },
      }),
    })

    await expect(
      getPhotoUrl('place-photos/user-123/place-123/1234567890.jpg'),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------------
// 5. deletePhoto removes from storage AND table
// ---------------------------------------------------------------------------

describe('Photo flow — deletePhoto', () => {
  it('removes both storage files and the DB record', async () => {
    const photo = createMockPhoto({
      id: 'photo-del',
      user_id: 'user-123',
      storage_path: 'place-photos/user-123/place-123/1234567890.jpg',
      thumbnail_path: 'place-photos/user-123/place-123/thumb_1234567890.jpg',
    })

    const storageBucket = mockStorageBucket()

    // Ownership check → returns photo
    getMockFrom().mockReturnValueOnce(mockChain({ data: photo, error: null }))
    // Delete DB record
    getMockFrom().mockReturnValueOnce(mockChain({ data: null, error: null }))

    await deletePhoto('photo-del', 'user-123')

    expect(storageBucket.remove).toHaveBeenCalledWith([
      'place-photos/user-123/place-123/1234567890.jpg',
      'place-photos/user-123/place-123/thumb_1234567890.jpg',
    ])
  })

  it('throws FORBIDDEN when photo does not belong to user', async () => {
    getMockFrom().mockReturnValueOnce(
      mockChain({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    )

    await expect(deletePhoto('photo-del', 'other-user')).rejects.toBeInstanceOf(ApiError)
  })
})
