/**
 * Photo security pipeline — Driftmark
 *
 * Security mitigations implemented here:
 *   AS-03 (TOP-2): EXIF GPS metadata stripped before upload.
 *     EXIF blocks can contain GPSLatitude/Longitude/Altitude, DateTimeOriginal,
 *     CameraSerial, and other PII. Re-encoding through ImageManipulator drops
 *     all metadata because expo-image-manipulator outputs bare pixel data.
 *   AS-03 T-03-A: Magic byte validation prevents MIME type spoofing.
 *     A file named "photo.jpg" with a PHP header is rejected.
 *   AS-03 T-03-C: File size limits enforced before processing.
 *   AS-03 T-03-D: Compression reduces upload size and storage cost.
 *
 * See THREAT_MODEL.md AS-03, TOP-2.
 */

import * as ImageManipulator from 'expo-image-manipulator'
// SDK 54 made the new FileSystem API the default; this module still uses the
// callback-style API (getInfoAsync/readAsStringAsync), which now lives under
// /legacy. Migrate to the new API before SDK 55 removes the legacy entry.
import * as FileSystem from 'expo-file-system/legacy'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum raw file size accepted for processing (5 MB) */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Maximum compressed file size accepted for upload (1 MB) */
const MAX_UPLOAD_SIZE_BYTES = 1 * 1024 * 1024

// ---------------------------------------------------------------------------
// Magic byte signatures
// ---------------------------------------------------------------------------
// Mitigates AS-03 T-03-A: validates the actual file content, not just the
// filename or Content-Type header. A JPEG must begin with FF D8 FF; a PNG
// must begin with 89 50 4E 47; a WebP with 52 49 46 46 (RIFF header).
//
// Note: WebP validation checks the RIFF header only — a full implementation
// would also validate bytes 8-11 (WEBP) but that requires a 12-byte read
// and expo-file-system readAsStringAsync with Base64 can handle it.

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF — WebP container
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class PhotoSecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PhotoSecurityError'
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates the file against its magic bytes to confirm the actual image type.
 * Returns the detected MIME type string if valid.
 * Throws PhotoSecurityError if the file type is not recognized or not allowed.
 *
 * Mitigates AS-03 T-03-A: prevents MIME type spoofing by inspecting file content.
 */
export async function validateImageMagicBytes(uri: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(uri)
  if (!fileInfo.exists) {
    throw new PhotoSecurityError('File does not exist')
  }

  // Read first 12 bytes (enough to validate JPEG, PNG, and WebP with WEBP tag)
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    length: 12,
    position: 0,
  })

  const bytes = Buffer.from(content, 'base64')

  for (const [mimeType, signature] of Object.entries(MAGIC_BYTES)) {
    if (signature.every((byte, i) => bytes[i] === byte)) {
      // Additional WebP check: bytes 8-11 should be "WEBP" (0x57 0x45 0x42 0x50)
      if (mimeType === 'image/webp') {
        const isWebP =
          bytes[8] === 0x57 && // W
          bytes[9] === 0x45 && // E
          bytes[10] === 0x42 && // B
          bytes[11] === 0x50  // P
        if (!isWebP) continue
      }
      return mimeType
    }
  }

  throw new PhotoSecurityError(
    'File type not allowed. Only JPEG, PNG, and WebP images are accepted.'
  )
}

/**
 * Validates that the file does not exceed the raw size limit.
 * Throws PhotoSecurityError if too large.
 *
 * Mitigates AS-03 T-03-C: prevents large file uploads from consuming
 * storage quota or causing OOM conditions during processing.
 */
export async function validateFileSize(uri: string): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(uri)
  if (!fileInfo.exists) {
    throw new PhotoSecurityError('File does not exist')
  }
  if ('size' in fileInfo && fileInfo.size > MAX_FILE_SIZE_BYTES) {
    throw new PhotoSecurityError(
      `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
    )
  }
}

// ---------------------------------------------------------------------------
// EXIF stripping
// ---------------------------------------------------------------------------

/**
 * Strips all EXIF metadata (including GPS coordinates) by re-encoding
 * the image through expo-image-manipulator.
 *
 * How it works: expo-image-manipulator decodes the image to raw pixel data
 * and re-encodes it as a new JPEG. The EXIF block is not preserved in the
 * output — only pixel data is transferred. This is the only reliable way
 * to strip EXIF on-device without a native EXIF library.
 *
 * Mitigates AS-03 TOP-2: prevents GPS coordinates from being embedded in
 * uploaded photos where they could reveal home address, hotel, or route.
 */
export async function stripExifData(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [], // No transforms — just re-encode to strip all metadata
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  )
  return result.uri
}

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

/**
 * Compresses the image to fit within MAX_UPLOAD_SIZE_BYTES (1 MB).
 * Tries quality 0.85 first; falls back to 0.7 if still too large.
 *
 * Mitigates AS-03 T-03-D: reduces storage footprint and upload time.
 */
export async function compressForUpload(uri: string): Promise<string> {
  let quality = 0.85
  let result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  })

  const info = await FileSystem.getInfoAsync(result.uri)
  if ('size' in info && info.size > MAX_UPLOAD_SIZE_BYTES) {
    quality = 0.7
    result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    })
  }

  return result.uri
}

/**
 * Creates a 200×200 thumbnail for display in lists and maps.
 * Thumbnails are stored at thumbnail_path; originals at storage_path.
 * Displaying thumbnails by default reduces both bandwidth and the risk
 * that a full-res photo URL is accidentally exposed.
 *
 * See THREAT_MODEL.md AS-03 M-03-F.
 */
export async function createThumbnail(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 200, height: 200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}

// ---------------------------------------------------------------------------
// Full processing pipeline
// ---------------------------------------------------------------------------

/**
 * Runs a photo through the complete security and optimization pipeline
 * before it is uploaded to Supabase Storage.
 *
 * Pipeline steps (all steps are mandatory; any failure aborts the upload):
 *
 *   1. **Validate file size** (`validateFileSize`)
 *      Checks that the raw file does not exceed 5 MB. Prevents large uploads
 *      from consuming storage quota or causing OOM during processing
 *      (mitigates AS-03 T-03-C).
 *
 *   2. **Validate magic bytes** (`validateImageMagicBytes`)
 *      Reads the first 12 bytes of the file and matches them against known
 *      JPEG (FF D8 FF), PNG (89 50 4E 47), and WebP (RIFF...WEBP) signatures.
 *      Rejects files whose content does not match an allowed image type
 *      regardless of filename or Content-Type header (mitigates AS-03 T-03-A).
 *      Returns the detected MIME type string for use in the Storage upload.
 *
 *   3. **Strip EXIF metadata** (`stripExifData`)
 *      Re-encodes the image through `expo-image-manipulator` with no
 *      transforms. The manipulator decodes the image to raw pixel data and
 *      emits a fresh JPEG, discarding the EXIF block entirely. This removes
 *      GPS coordinates, DateTimeOriginal, camera serial number, and other PII
 *      that could reveal the user's location or equipment (mitigates AS-03
 *      TOP-2). The original file URI is not modified; a new temp URI is
 *      returned by each step.
 *
 *   4. **Compress for upload** (`compressForUpload`)
 *      Attempts compression at quality 0.85. If the output still exceeds 1 MB
 *      it retries at quality 0.7. This keeps uploads within the Storage budget
 *      and reduces load time on low-bandwidth connections (mitigates AS-03
 *      T-03-D).
 *
 *   5. **Create thumbnail** (`createThumbnail`)
 *      Produces a 200×200 JPEG from the compressed image. Thumbnails are
 *      stored at `place_photos.thumbnail_path` and used for all in-app
 *      display. Full-resolution originals are only served via short-lived
 *      signed URLs (300 s TTL), reducing accidental exposure (AS-03 M-03-F).
 *
 * @param uri - Local file URI from expo-image-picker or a camera capture
 * @returns Object containing:
 *   - `processedUri`: compressed, EXIF-free JPEG ready for Storage upload
 *   - `thumbnailUri`: 200×200 JPEG for the `thumbnail_path` DB column
 *   - `mimeType`: detected MIME type (e.g. `"image/jpeg"`)
 * @throws PhotoSecurityError if any validation step fails
 * @throws Error (expo) if image manipulation fails
 */
export async function processPhotoForUpload(uri: string): Promise<{
  processedUri: string
  thumbnailUri: string
  mimeType: string
}> {
  await validateFileSize(uri)
  const mimeType = await validateImageMagicBytes(uri)
  const exifStripped = await stripExifData(uri)
  const compressed = await compressForUpload(exifStripped)
  const thumbnail = await createThumbnail(compressed)

  return {
    processedUri: compressed,
    thumbnailUri: thumbnail,
    mimeType,
  }
}
