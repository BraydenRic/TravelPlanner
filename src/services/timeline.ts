/**
 * Timeline service — paginated chronological travel history.
 *
 * Joins visited_places → cities → place_photos → place_ratings for a rich
 * timeline view. Only 'been' category places appear in the timeline.
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError } from '@lib/apiErrors'
import type { TimelineEntry, PaginatedResponse } from '@typedefs/api'
import type { PlacePhoto } from '@typedefs/database'

// ---------------------------------------------------------------------------
// getTimeline
// ---------------------------------------------------------------------------

export async function getTimeline(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<PaginatedResponse<TimelineEntry>> {
  let query = supabase
    .from('visited_places')
    .select(
      'id, country_code, city_id, category, visited_date, overall_score, review, created_at, cities(name)',
    )
    .eq('user_id', userId)
    .eq('category', 'been')
    .order('visited_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('visited_date', cursor)
  }

  const { data, error } = await query

  if (error) throw handleSupabaseError(error)

  const rows = (data ?? []) as {
    id: string
    country_code: string
    city_id: string | null
    category: 'been'
    visited_date: string | null
    overall_score: number | null
    review: string | null
    created_at: string
    cities: { name: string } | null
  }[]

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (items[limit - 1]?.visited_date ?? null) : null

  if (items.length === 0) {
    return { data: [], nextCursor: null, hasMore: false }
  }

  // Fetch photos for all visited place IDs
  const placeIds = items.map((p) => p.id)

  const { data: photosData, error: photosError } = await supabase
    .from('place_photos')
    .select('id, visited_place_id, user_id, storage_path, thumbnail_path, caption, sort_order, created_at')
    .in('visited_place_id', placeIds)
    .order('sort_order')

  if (photosError) throw handleSupabaseError(photosError)

  const photosByPlace = new Map<string, PlacePhoto[]>()
  for (const photo of (photosData ?? []) as PlacePhoto[]) {
    const existing = photosByPlace.get(photo.visited_place_id) ?? []
    existing.push(photo)
    photosByPlace.set(photo.visited_place_id, existing)
  }

  const entries: TimelineEntry[] = items.map((place) => ({
    id: place.id,
    country_code: place.country_code,
    city_id: place.city_id,
    city_name: place.cities?.name ?? null,
    category: place.category,
    visited_date: place.visited_date,
    overall_score: place.overall_score,
    photos: photosByPlace.get(place.id) ?? [],
    review: place.review,
  }))

  return { data: entries, nextCursor, hasMore }
}
