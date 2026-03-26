/**
 * Sharing service — generate share card data and upload rendered cards.
 *
 * Security (THREAT_MODEL M-10-C, M-10-D):
 *   - Only non-sensitive fields included (no budget, daily spend, or detailed breakdowns)
 *   - Storage path includes crypto random component
 *   - Returns signed URL with 7-day TTL — never a public URL
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError } from '@lib/apiErrors'
// ShareCardData type is defined in @types/api — used for consumer-side typing

// ---------------------------------------------------------------------------
// getShareCardData
// ---------------------------------------------------------------------------

export async function getShareCardData(userId: string): Promise<{
  visitedCountryCodes: string[]
  stats: { countriesVisited: number; citiesVisited: number; averageRating: number | null }
  displayName: string
  avatarUrl: string | null
}> {
  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single()

  if (profileError) throw handleSupabaseError(profileError)

  const typedProfile = profile as { display_name: string; avatar_url: string | null }

  // Get visited countries
  const { data: places, error: placesError } = await supabase
    .from('visited_places')
    .select('country_code, overall_score')
    .eq('user_id', userId)
    .eq('category', 'been')

  if (placesError) throw handleSupabaseError(placesError)

  const typedPlaces = (places ?? []) as {
    country_code: string
    overall_score: number | null
  }[]

  const visitedCountryCodes = [...new Set(typedPlaces.map((p) => p.country_code))]

  const scores = typedPlaces
    .map((p) => p.overall_score)
    .filter((s): s is number => s !== null)

  const averageRating =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null

  return {
    visitedCountryCodes,
    stats: {
      countriesVisited: visitedCountryCodes.length,
      citiesVisited: typedPlaces.length,
      averageRating,
    },
    displayName: typedProfile.display_name,
    avatarUrl: typedProfile.avatar_url,
  }
}

// ---------------------------------------------------------------------------
// saveShareCard — uploads PNG and returns public URL
// ---------------------------------------------------------------------------

export async function saveShareCard(userId: string, imageUri: string): Promise<string> {
  const timestamp = Date.now()

  // Generate random component (8 hex chars) for path security (M-10-D)
  const randomComponent = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const storagePath = `share-cards/${userId}/${timestamp}_${randomComponent}.png`

  const response = await fetch(imageUri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from('share-cards')
    .upload(storagePath, blob, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    throw handleSupabaseError(uploadError as Parameters<typeof handleSupabaseError>[0])
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('share-cards').getPublicUrl(storagePath)

  return publicUrl
}
