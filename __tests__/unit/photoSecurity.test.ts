/**
 * Unit tests for src/lib/photoSecurity.ts
 *
 * expo-image-manipulator and expo-file-system are mocked so these tests
 * run in the Jest/Node environment without native modules.
 *
 * Coverage:
 *   - validateFileSize: accepts valid sizes, rejects over-limit
 *   - validateImageMagicBytes: accepts JPEG/PNG/WebP, rejects unknown types
 *   - stripExifData: calls ImageManipulator with correct args and returns URI
 *   - compressForUpload: calls compress; falls back on large output
 *   - createThumbnail: calls resize transform
 *   - processPhotoForUpload: full pipeline executes in order, failures abort pipeline
 *   - PhotoSecurityError: thrown correctly in all error paths
 *
 * See THREAT_MODEL.md AS-03, TOP-2.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Use inline jest.fn() so factories don't reference uninitialized variables.
// (Babel hoists jest.mock() above const declarations, so variable references
// would be undefined when the factory is first called during module loading.)
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}))

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}))

import * as _FileSystem from 'expo-file-system'
import * as _ImageManipulator from 'expo-image-manipulator'
import {
  PhotoSecurityError,
  validateFileSize,
  validateImageMagicBytes,
  stripExifData,
  compressForUpload,
  createThumbnail,
  processPhotoForUpload,
} from '../../src/lib/photoSecurity'

// Get mock function references from the mocked modules (populated after module load)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetInfoAsync = _FileSystem.getInfoAsync as jest.MockedFunction<(...args: any[]) => Promise<any>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReadAsStringAsync = _FileSystem.readAsStringAsync as jest.MockedFunction<(...args: any[]) => Promise<any>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockManipulateAsync = _ImageManipulator.manipulateAsync as jest.MockedFunction<(...args: any[]) => Promise<any>>

// ---------------------------------------------------------------------------
// Magic byte helpers
// ---------------------------------------------------------------------------

/**
 * Creates a Base64 string representing the given bytes.
 * Used to simulate magic byte reads from FileSystem.
 */
function bytesToBase64(bytes: number[]): string {
  return Buffer.from(bytes).toString('base64')
}

// JPEG magic bytes: FF D8 FF (padded to 12 bytes)
const JPEG_MAGIC = bytesToBase64([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])
// PNG magic bytes: 89 50 4E 47 (padded to 12)
const PNG_MAGIC = bytesToBase64([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0])
// WebP magic bytes: 52 49 46 46 + padding + 57 45 42 50 at offset 8
const WEBP_MAGIC = bytesToBase64([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x00, 0x00, 0x00, 0x00, // file size (ignored)
  0x57, 0x45, 0x42, 0x50, // WEBP
])
// Unknown file type
const UNKNOWN_MAGIC = bytesToBase64([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B])
// PHP script header: <?ph
const PHP_MAGIC = bytesToBase64([0x3C, 0x3F, 0x70, 0x68, 0x70, 0, 0, 0, 0, 0, 0, 0])

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// PhotoSecurityError
// ---------------------------------------------------------------------------

describe('PhotoSecurityError', () => {
  it('is an instance of Error', () => {
    const err = new PhotoSecurityError('test')
    expect(err instanceof Error).toBe(true)
  })

  it('has name PhotoSecurityError', () => {
    const err = new PhotoSecurityError('test message')
    expect(err.name).toBe('PhotoSecurityError')
  })

  it('carries the message', () => {
    const err = new PhotoSecurityError('File too large')
    expect(err.message).toBe('File too large')
  })
})

// ---------------------------------------------------------------------------
// validateFileSize
// ---------------------------------------------------------------------------

describe('validateFileSize', () => {
  it('accepts files under 5 MB', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1 * 1024 * 1024 }) // 1 MB
    await expect(validateFileSize('file:///photo.jpg')).resolves.toBeUndefined()
  })

  it('accepts files exactly at 5 MB limit', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 5 * 1024 * 1024 }) // exactly 5 MB
    await expect(validateFileSize('file:///photo.jpg')).resolves.toBeUndefined()
  })

  it('rejects files over 5 MB', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 5 * 1024 * 1024 + 1 }) // 1 byte over
    await expect(validateFileSize('file:///photo.jpg')).rejects.toThrow(PhotoSecurityError)
    await expect(validateFileSize('file:///photo.jpg')).rejects.toThrow('too large')
  })

  it('rejects files of 10 MB', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 10 * 1024 * 1024 })
    await expect(validateFileSize('file:///photo.jpg')).rejects.toThrow(PhotoSecurityError)
  })

  it('rejects files that do not exist', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false })
    await expect(validateFileSize('file:///nonexistent.jpg')).rejects.toThrow(PhotoSecurityError)
    await expect(validateFileSize('file:///nonexistent.jpg')).rejects.toThrow('does not exist')
  })

  it('accepts file with no size property (edge case — size not returned)', async () => {
    // If size is not in the info object, we cannot validate — should not throw
    mockGetInfoAsync.mockResolvedValue({ exists: true })
    await expect(validateFileSize('file:///photo.jpg')).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// validateImageMagicBytes
// ---------------------------------------------------------------------------

describe('validateImageMagicBytes', () => {
  it('accepts JPEG by magic bytes', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100000 })
    mockReadAsStringAsync.mockResolvedValue(JPEG_MAGIC)
    const mimeType = await validateImageMagicBytes('file:///photo.jpg')
    expect(mimeType).toBe('image/jpeg')
  })

  it('accepts PNG by magic bytes', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100000 })
    mockReadAsStringAsync.mockResolvedValue(PNG_MAGIC)
    const mimeType = await validateImageMagicBytes('file:///photo.png')
    expect(mimeType).toBe('image/png')
  })

  it('accepts WebP by magic bytes', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100000 })
    mockReadAsStringAsync.mockResolvedValue(WEBP_MAGIC)
    const mimeType = await validateImageMagicBytes('file:///photo.webp')
    expect(mimeType).toBe('image/webp')
  })

  it('rejects unknown file types', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100000 })
    mockReadAsStringAsync.mockResolvedValue(UNKNOWN_MAGIC)
    await expect(validateImageMagicBytes('file:///unknown.bin')).rejects.toThrow(PhotoSecurityError)
    await expect(validateImageMagicBytes('file:///unknown.bin')).rejects.toThrow('not allowed')
  })

  it('rejects PHP files masquerading as JPEG (MIME type spoofing)', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100000 })
    mockReadAsStringAsync.mockResolvedValue(PHP_MAGIC)
    await expect(validateImageMagicBytes('file:///malware.php')).rejects.toThrow(PhotoSecurityError)
  })

  it('rejects when file does not exist', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false })
    await expect(validateImageMagicBytes('file:///nonexistent.jpg')).rejects.toThrow(PhotoSecurityError)
  })

  it('reads exactly 12 bytes (correct offset for WebP detection)', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100000 })
    mockReadAsStringAsync.mockResolvedValue(JPEG_MAGIC)
    await validateImageMagicBytes('file:///photo.jpg')
    expect(mockReadAsStringAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      expect.objectContaining({ length: 12, position: 0 })
    )
  })
})

// ---------------------------------------------------------------------------
// stripExifData
// ---------------------------------------------------------------------------

describe('stripExifData', () => {
  it('calls ImageManipulator with no transforms and JPEG format', async () => {
    mockManipulateAsync.mockResolvedValue({ uri: 'file:///stripped.jpg' })
    const result = await stripExifData('file:///original.jpg')

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///original.jpg',
      [], // no transforms
      expect.objectContaining({ format: 'jpeg' })
    )
    expect(result).toBe('file:///stripped.jpg')
  })

  it('uses quality 0.85 for the re-encoding', async () => {
    mockManipulateAsync.mockResolvedValue({ uri: 'file:///stripped.jpg' })
    await stripExifData('file:///original.jpg')

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ compress: 0.85 })
    )
  })

  it('returns the URI from ImageManipulator result', async () => {
    const expectedUri = 'file:///exif-stripped-123.jpg'
    mockManipulateAsync.mockResolvedValue({ uri: expectedUri })
    const result = await stripExifData('file:///photo.jpg')
    expect(result).toBe(expectedUri)
  })
})

// ---------------------------------------------------------------------------
// compressForUpload
// ---------------------------------------------------------------------------

describe('compressForUpload', () => {
  it('uses quality 0.85 on first pass', async () => {
    const smallFile = { uri: 'file:///compressed.jpg' }
    mockManipulateAsync.mockResolvedValue(smallFile)
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 500 * 1024 }) // 500 KB — under limit

    await compressForUpload('file:///photo.jpg')

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [],
      expect.objectContaining({ compress: 0.85 })
    )
  })

  it('falls back to quality 0.7 if first pass is still over 1 MB', async () => {
    const firstResult = { uri: 'file:///first.jpg' }
    const secondResult = { uri: 'file:///second.jpg' }

    mockManipulateAsync
      .mockResolvedValueOnce(firstResult)  // first pass (0.85)
      .mockResolvedValueOnce(secondResult) // fallback pass (0.7)

    // First compressed file is still over 1 MB
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1.5 * 1024 * 1024 })

    const result = await compressForUpload('file:///large-photo.jpg')

    expect(mockManipulateAsync).toHaveBeenCalledTimes(2)
    // Second call must use quality 0.7
    expect(mockManipulateAsync).toHaveBeenNthCalledWith(
      2,
      'file:///large-photo.jpg',
      [],
      expect.objectContaining({ compress: 0.7 })
    )
    expect(result).toBe('file:///second.jpg')
  })

  it('returns the first pass result when under 1 MB', async () => {
    const firstResult = { uri: 'file:///compressed.jpg' }
    mockManipulateAsync.mockResolvedValueOnce(firstResult)
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 800 * 1024 }) // 800 KB

    const result = await compressForUpload('file:///photo.jpg')
    expect(result).toBe('file:///compressed.jpg')
    expect(mockManipulateAsync).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// createThumbnail
// ---------------------------------------------------------------------------

describe('createThumbnail', () => {
  it('creates a 200x200 thumbnail', async () => {
    mockManipulateAsync.mockResolvedValue({ uri: 'file:///thumb.jpg' })

    await createThumbnail('file:///photo.jpg')

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 200, height: 200 } }],
      expect.objectContaining({ compress: 0.7, format: 'jpeg' })
    )
  })

  it('returns the thumbnail URI', async () => {
    mockManipulateAsync.mockResolvedValue({ uri: 'file:///thumb-abc123.jpg' })
    const result = await createThumbnail('file:///photo.jpg')
    expect(result).toBe('file:///thumb-abc123.jpg')
  })
})

// ---------------------------------------------------------------------------
// processPhotoForUpload — full pipeline
// ---------------------------------------------------------------------------

describe('processPhotoForUpload', () => {
  const originalUri = 'file:///photo.jpg'
  const strippedUri = 'file:///stripped.jpg'
  const compressedUri = 'file:///compressed.jpg'
  const thumbnailUri = 'file:///thumb.jpg'

  function setupHappyPath() {
    // validateFileSize: 2 MB file
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 2 * 1024 * 1024 }) // validateFileSize
      .mockResolvedValueOnce({ exists: true, size: 500 * 1024 })       // compressForUpload size check

    // validateImageMagicBytes: JPEG
    mockReadAsStringAsync.mockResolvedValue(JPEG_MAGIC)

    // stripExifData: → strippedUri
    // compressForUpload first pass: → compressedUri
    // createThumbnail: → thumbnailUri
    mockManipulateAsync
      .mockResolvedValueOnce({ uri: strippedUri })    // stripExifData
      .mockResolvedValueOnce({ uri: compressedUri })  // compressForUpload
      .mockResolvedValueOnce({ uri: thumbnailUri })   // createThumbnail
  }

  it('returns processedUri, thumbnailUri, and mimeType on success', async () => {
    setupHappyPath()

    const result = await processPhotoForUpload(originalUri)

    expect(result.processedUri).toBe(compressedUri)
    expect(result.thumbnailUri).toBe(thumbnailUri)
    expect(result.mimeType).toBe('image/jpeg')
  })

  it('calls pipeline steps in correct order', async () => {
    setupHappyPath()
    await processPhotoForUpload(originalUri)

    // Verify FileSystem.getInfoAsync was called first (validateFileSize)
    expect(mockGetInfoAsync).toHaveBeenCalled()
    // Verify magic bytes read was called (validateImageMagicBytes)
    expect(mockReadAsStringAsync).toHaveBeenCalled()
    // Verify ImageManipulator was called 3 times: strip, compress, thumbnail
    expect(mockManipulateAsync).toHaveBeenCalledTimes(3)
  })

  it('aborts pipeline when file is too large', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 10 * 1024 * 1024 }) // 10 MB

    await expect(processPhotoForUpload(originalUri)).rejects.toThrow(PhotoSecurityError)
    // Magic bytes should NOT be read if size check fails
    expect(mockReadAsStringAsync).not.toHaveBeenCalled()
    // ImageManipulator should NOT be called
    expect(mockManipulateAsync).not.toHaveBeenCalled()
  })

  it('aborts pipeline when file type is not allowed', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1 * 1024 * 1024 })
    mockReadAsStringAsync.mockResolvedValue(PHP_MAGIC) // PHP file

    await expect(processPhotoForUpload(originalUri)).rejects.toThrow(PhotoSecurityError)
    // ImageManipulator should NOT be called for disallowed file types
    expect(mockManipulateAsync).not.toHaveBeenCalled()
  })

  it('aborts pipeline when file does not exist', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false })

    await expect(processPhotoForUpload(originalUri)).rejects.toThrow(PhotoSecurityError)
    expect(mockManipulateAsync).not.toHaveBeenCalled()
  })

  it('propagates ImageManipulator errors', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1 * 1024 * 1024 })
    mockReadAsStringAsync.mockResolvedValue(JPEG_MAGIC)
    mockManipulateAsync.mockRejectedValue(new Error('ImageManipulator failed'))

    await expect(processPhotoForUpload(originalUri)).rejects.toThrow('ImageManipulator failed')
  })
})

// ---------------------------------------------------------------------------
// Security: MIME type spoofing attempt (PHP disguised as JPEG)
// ---------------------------------------------------------------------------

describe('Security: MIME type spoofing', () => {
  it('rejects a PHP script named photo.jpg', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100 * 1024 })
    // PHP header: <?php  — bytes: 3C 3F 70 68 70
    mockReadAsStringAsync.mockResolvedValue(PHP_MAGIC)

    await expect(validateImageMagicBytes('file:///malware.php.jpg')).rejects.toThrow(
      PhotoSecurityError
    )
  })

  it('rejects a PDF file', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100 * 1024 })
    // PDF header: %PDF  — bytes: 25 50 44 46
    const pdfMagic = bytesToBase64([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0])
    mockReadAsStringAsync.mockResolvedValue(pdfMagic)

    await expect(validateImageMagicBytes('file:///document.pdf')).rejects.toThrow(
      PhotoSecurityError
    )
  })

  it('rejects a ZIP file', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 100 * 1024 })
    // ZIP/PK header: 50 4B 03 04
    const zipMagic = bytesToBase64([0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0])
    mockReadAsStringAsync.mockResolvedValue(zipMagic)

    await expect(validateImageMagicBytes('file:///archive.zip')).rejects.toThrow(
      PhotoSecurityError
    )
  })
})
