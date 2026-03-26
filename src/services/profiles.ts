/**
 * Profiles service — read and update user profiles, manage avatars.
 *
 * Security:
 *   - display_name is validated and sanitized before storage (AS-06)
 *   - Avatar uploads go through the photo security pipeline (AS-03)
 *   - EXIF data stripped before upload
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError } from '@lib/apiErrors'
import { updateProfileSchema, type UpdateProfileInput } from '@lib/validation'
import { sanitizeDisplayName } from '@lib/sanitize'
import { processPhotoForUpload } from '@lib/photoSecurity'
import type { Profile } from '@typedefs/database'

const PROFILE_COLUMNS = 'id, google_id, display_name, avatar_url, created_at, updated_at'

// ---------------------------------------------------------------------------
// getProfile — own profile
// ---------------------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single()

  if (error) {
    // PGRST116 = row not found — return null rather than throwing
    if (error.code === 'PGRST116') return null
    throw handleSupabaseError(error)
  }

  return data as Profile
}

// ---------------------------------------------------------------------------
// getProfileById — public profile lookup
// ---------------------------------------------------------------------------

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw handleSupabaseError(error)
  }

  return data as Profile
}

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  const validated = updateProfileSchema.parse(input)

  const sanitized: UpdateProfileInput = {
    ...validated,
    display_name: sanitizeDisplayName(validated.display_name),
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(sanitized)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as Profile
}

// ---------------------------------------------------------------------------
// uploadAvatar
// ---------------------------------------------------------------------------

export async function uploadAvatar(userId: string, fileUri: string): Promise<Profile> {
  // Run through security pipeline: validate size, magic bytes, strip EXIF, compress
  const { processedUri } = await processPhotoForUpload(fileUri)

  const timestamp = Date.now()
  const storagePath = `avatars/${userId}/${timestamp}.jpg`

  // Fetch the processed file as a blob
  const response = await fetch(processedUri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    throw handleSupabaseError(uploadError as Parameters<typeof handleSupabaseError>[0])
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(storagePath)

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as Profile
}

// ---------------------------------------------------------------------------
// deleteAvatar
// ---------------------------------------------------------------------------

export async function deleteAvatar(userId: string): Promise<Profile> {
  // Get current avatar_url to extract storage path
  const profile = await getProfile(userId)
  if (profile?.avatar_url) {
    // Extract storage path from URL
    const url = new URL(profile.avatar_url)
    const pathParts = url.pathname.split('/avatars/')
    if (pathParts.length > 1) {
      const storagePath = pathParts[1]
      await supabase.storage.from('avatars').remove([storagePath])
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as Profile
}
