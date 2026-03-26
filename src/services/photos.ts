/**
 * Photos service — upload, manage, and serve place photos.
 *
 * Security:
 *   - All uploads pass through processPhotoForUpload (EXIF strip, size check, magic bytes)
 *   - Original photos served only via signed URLs (60 min TTL, not public) (AS-03 M-03-F)
 *   - Ownership verified before delete
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError, ApiError } from '@lib/apiErrors'
import { sanitizeCaption } from '@lib/sanitize'
import { processPhotoForUpload } from '@lib/photoSecurity'
import type { PlacePhoto } from '@typedefs/database'

const PHOTO_COLUMNS =
  'id, visited_place_id, user_id, storage_path, thumbnail_path, caption, sort_order, created_at'

// ---------------------------------------------------------------------------
// uploadPhoto
// ---------------------------------------------------------------------------

export async function uploadPhoto(
  userId: string,
  visitedPlaceId: string,
  fileUri: string,
  caption?: string,
): Promise<PlacePhoto> {
  // Full security pipeline: validate size, magic bytes, strip EXIF, compress, thumbnail
  const { processedUri, thumbnailUri } = await processPhotoForUpload(fileUri)

  const timestamp = Date.now()
  // Object paths are relative to the bucket root — do NOT include the bucket name.
  // The RLS policy checks (storage.foldername(name))[1] = auth.uid()::text,
  // so the first path segment MUST be the userId, not the bucket name.
  const storagePath = `${userId}/${visitedPlaceId}/${timestamp}.jpg`
  const thumbnailPath = `${userId}/${visitedPlaceId}/thumb_${timestamp}.jpg`

  // Upload main photo
  const mainResponse = await fetch(processedUri)
  const mainBlob = await mainResponse.blob()

  const { error: mainUploadError } = await supabase.storage
    .from('place-photos')
    .upload(storagePath, mainBlob, { contentType: 'image/jpeg' })

  if (mainUploadError) {
    throw handleSupabaseError(mainUploadError as Parameters<typeof handleSupabaseError>[0])
  }

  // Upload thumbnail
  const thumbResponse = await fetch(thumbnailUri)
  const thumbBlob = await thumbResponse.blob()

  const { error: thumbUploadError } = await supabase.storage
    .from('place-photos')
    .upload(thumbnailPath, thumbBlob, { contentType: 'image/jpeg' })

  if (thumbUploadError) {
    throw handleSupabaseError(thumbUploadError as Parameters<typeof handleSupabaseError>[0])
  }

  // Create DB record
  const { data, error } = await supabase
    .from('place_photos')
    .insert({
      visited_place_id: visitedPlaceId,
      user_id: userId,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      caption: caption ? sanitizeCaption(caption) : null,
      sort_order: 0,
    })
    .select(PHOTO_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as PlacePhoto
}

// ---------------------------------------------------------------------------
// getPlacePhotos
// ---------------------------------------------------------------------------

export async function getPlacePhotos(visitedPlaceId: string): Promise<PlacePhoto[]> {
  const { data, error } = await supabase
    .from('place_photos')
    .select(PHOTO_COLUMNS)
    .eq('visited_place_id', visitedPlaceId)
    .order('sort_order')

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as PlacePhoto[]
}

// ---------------------------------------------------------------------------
// deletePhoto
// ---------------------------------------------------------------------------

export async function deletePhoto(photoId: string, userId: string): Promise<void> {
  // Verify ownership first
  const { data, error: fetchError } = await supabase
    .from('place_photos')
    .select('id, user_id, storage_path, thumbnail_path')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single()

  if (fetchError) throw handleSupabaseError(fetchError)
  if (!data) throw new ApiError('FORBIDDEN', 'You do not own this photo')

  const photo = data as Pick<PlacePhoto, 'id' | 'user_id' | 'storage_path' | 'thumbnail_path'>

  // Delete from storage (both main and thumbnail)
  await supabase.storage.from('place-photos').remove([photo.storage_path, photo.thumbnail_path])

  // Delete DB record
  const { error: deleteError } = await supabase
    .from('place_photos')
    .delete()
    .eq('id', photoId)

  if (deleteError) throw handleSupabaseError(deleteError)
}

// ---------------------------------------------------------------------------
// reorderPhotos
// ---------------------------------------------------------------------------

export async function reorderPhotos(
  photos: { id: string; sort_order: number }[],
  userId: string,
): Promise<void> {
  // Batch update each photo's sort_order
  await Promise.all(
    photos.map(async ({ id, sort_order }) => {
      const { error } = await supabase
        .from('place_photos')
        .update({ sort_order })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw handleSupabaseError(error)
    }),
  )
}

// ---------------------------------------------------------------------------
// getPhotoUrl — signed URL (60 min expiry) for private bucket
// ---------------------------------------------------------------------------

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('place-photos')
    .createSignedUrl(storagePath, 60 * 60) // 60 minutes

  if (error) {
    throw handleSupabaseError(error as Parameters<typeof handleSupabaseError>[0])
  }

  return data.signedUrl
}
