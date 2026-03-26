/**
 * Ratings service — upsert, query, and aggregate place ratings.
 *
 * Security:
 *   - Ownership is verified before upsert (AS-02)
 *   - All inputs are validated via Zod schemas (AS-06)
 *   - computeOverallScore is pure/client-side — no DB access needed
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError, ApiError } from '@lib/apiErrors'
import { placeRatingsSchema, type PlaceRatingsInput } from '@lib/validation'
import type { PlaceRating, RatingCategory } from '@typedefs/database'
import type { CountryRatings, GroupCountryRatings } from '@typedefs/api'
import { RATING_CATEGORIES } from '@constants/ratingCategories'

// ---------------------------------------------------------------------------
// upsertPlaceRatings
// ---------------------------------------------------------------------------

/**
 * Inserts or updates category scores for a visited place.
 *
 * Ownership is verified before any write: a preliminary SELECT confirms that
 * the `visited_place_id` belongs to `userId`. If the check fails the function
 * throws a FORBIDDEN ApiError, preventing one user from overwriting another
 * user's ratings even if they somehow obtain the place UUID (AS-02).
 *
 * Input is validated via `placeRatingsSchema` (Zod) before the ownership
 * check so that malformed payloads are rejected early.
 *
 * Uses an upsert on `(visited_place_id, category)` so repeated calls are
 * idempotent — safe to call after every rating change.
 *
 * @param visitedPlaceId - UUID of the visited_places row to rate
 * @param userId - UUID of the authenticated user making the request
 * @param ratings - Partial map of rating_category → score (1–5)
 * @returns The upserted PlaceRating rows (empty array if no scores provided)
 * @throws ApiError FORBIDDEN if the place does not belong to userId
 */
export async function upsertPlaceRatings(
  visitedPlaceId: string,
  userId: string,
  ratings: Partial<PlaceRatingsInput>,
): Promise<PlaceRating[]> {
  // Validate input
  placeRatingsSchema.parse(ratings)

  // Verify ownership: check that the visited place belongs to this user
  const { data: ownerCheck, error: ownerError } = await supabase
    .from('visited_places')
    .select('id')
    .eq('id', visitedPlaceId)
    .eq('user_id', userId)
    .single()

  if (ownerError) throw handleSupabaseError(ownerError)
  if (!ownerCheck) {
    throw new ApiError('FORBIDDEN', 'You do not own this visited place')
  }

  // Build upsert rows
  const rows = (Object.entries(ratings) as [RatingCategory, 1 | 2 | 3 | 4 | 5][])
    .filter(([, score]) => score !== undefined)
    .map(([category, score]) => ({
      visited_place_id: visitedPlaceId,
      category,
      score,
    }))

  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('place_ratings')
    .upsert(rows, { onConflict: 'visited_place_id,category' })
    .select('id, visited_place_id, category, score, created_at')

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as PlaceRating[]
}

// ---------------------------------------------------------------------------
// getPlaceRatings
// ---------------------------------------------------------------------------

export async function getPlaceRatings(visitedPlaceId: string): Promise<PlaceRating[]> {
  const { data, error } = await supabase
    .from('place_ratings')
    .select('id, visited_place_id, category, score, created_at')
    .eq('visited_place_id', visitedPlaceId)
    .order('category')

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as PlaceRating[]
}

// ---------------------------------------------------------------------------
// getCountryRatings — calls compute_country_ratings RPC
// ---------------------------------------------------------------------------

/**
 * Returns aggregated rating data for all of a user's visits to a country.
 *
 * Delegates to the `compute_country_ratings` PostgreSQL RPC function which
 * performs a GROUP BY across all `place_ratings` rows linked to the user's
 * `visited_places` entries for the given country. The RPC runs as
 * SECURITY INVOKER and validates that `auth.uid() = p_user_id`, so the
 * result is always scoped to the authenticated caller.
 *
 * Returned shape includes the overall average score, per-category averages,
 * and city coverage counts useful for the radar chart and country detail screen.
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g. "JP")
 * @param userId - UUID of the authenticated user; must match auth.uid()
 * @returns CountryRatings containing overall_score, per-category averages, and city counts
 * @throws ApiError if the RPC fails or the user is not authorized
 */
export async function getCountryRatings(
  countryCode: string,
  userId: string,
): Promise<CountryRatings> {
  const { data, error } = await supabase.rpc('compute_country_ratings', {
    p_country_code: countryCode,
    p_user_id: userId,
  })

  if (error) throw handleSupabaseError(error)

  const rpcResult = data as {
    overall_score: number
    categories: Record<RatingCategory, number>
    cities_rated: number
    total_cities: number
  }

  return {
    country_code: countryCode,
    overall_score: rpcResult.overall_score,
    categories: rpcResult.categories,
    cities_rated: rpcResult.cities_rated,
    total_cities: rpcResult.total_cities,
  }
}

// ---------------------------------------------------------------------------
// getGroupCountryRatings — calls compute_group_country_ratings RPC
// ---------------------------------------------------------------------------

export async function getGroupCountryRatings(
  groupId: string,
  countryCode: string,
): Promise<GroupCountryRatings> {
  const { data, error } = await supabase.rpc('compute_group_country_ratings', {
    p_group_id: groupId,
    p_country_code: countryCode,
  })

  if (error) throw handleSupabaseError(error)

  const rpcResult = data as {
    group_average: Record<RatingCategory, number>
    group_overall: number
    member_ratings: GroupCountryRatings['member_ratings']
  }

  return {
    country_code: countryCode,
    group_average: rpcResult.group_average,
    group_overall: rpcResult.group_overall,
    member_ratings: rpcResult.member_ratings,
  }
}

// ---------------------------------------------------------------------------
// getTopRatedCountries — aggregates from visited_places + place_ratings
// ---------------------------------------------------------------------------

export async function getTopRatedCountries(
  userId: string,
  category?: RatingCategory,
  limit = 10,
): Promise<{ country_code: string; score: number }[]> {
  // Get all visited places for this user
  const { data: places, error: placesError } = await supabase
    .from('visited_places')
    .select('id, country_code, overall_score')
    .eq('user_id', userId)
    .eq('category', 'been')
    .not('overall_score', 'is', null)

  if (placesError) throw handleSupabaseError(placesError)

  if (!places || places.length === 0) return []

  if (category) {
    // Get ratings for this specific category
    const placeIds = (places as { id: string }[]).map((p) => p.id)

    const { data: ratings, error: ratingsError } = await supabase
      .from('place_ratings')
      .select('visited_place_id, score')
      .eq('category', category)
      .in('visited_place_id', placeIds)

    if (ratingsError) throw handleSupabaseError(ratingsError)

    // Group by country and average scores
    const ratingsByPlace = new Map<string, number>()
    for (const r of (ratings ?? []) as { visited_place_id: string; score: number }[]) {
      ratingsByPlace.set(r.visited_place_id, r.score)
    }

    const countryScores = new Map<string, number[]>()
    for (const place of places as { id: string; country_code: string }[]) {
      const score = ratingsByPlace.get(place.id)
      if (score === undefined) continue
      const existing = countryScores.get(place.country_code) ?? []
      existing.push(score)
      countryScores.set(place.country_code, existing)
    }

    return Array.from(countryScores.entries())
      .map(([country_code, scores]) => ({
        country_code,
        score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // Use overall_score
  const countryScores = new Map<string, number[]>()
  for (const place of places as { country_code: string; overall_score: number | null }[]) {
    if (place.overall_score === null) continue
    const existing = countryScores.get(place.country_code) ?? []
    existing.push(place.overall_score)
    countryScores.set(place.country_code, existing)
  }

  return Array.from(countryScores.entries())
    .map(([country_code, scores]) => ({
      country_code,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// computeOverallScore — pure client-side calculation
// ---------------------------------------------------------------------------

/**
 * Computes an overall rating score from a partial set of category scores.
 *
 * Averages all provided scores (1–5) by summing them and dividing by the
 * count of defined values. Categories omitted from the input (undefined or
 * null) are excluded from both the numerator and denominator, so a user
 * who rates only 3 out of 10 categories receives an average of those 3
 * scores rather than a diluted score penalized for missing categories.
 *
 * The result is rounded to one decimal place (e.g. 3.666… → 3.7).
 * Returns null when no scores are provided, signalling that no rating
 * exists yet for display purposes.
 *
 * This is a pure function — no network calls, no side effects.
 *
 * @param ratings - Partial map of rating_category → score (1–5)
 * @returns Average score rounded to 1 decimal place, or null if no scores
 */
export function computeOverallScore(ratings: Partial<PlaceRatingsInput>): number | null {
  const scores = Object.values(ratings).filter(
    (v): v is 1 | 2 | 3 | 4 | 5 => v !== undefined && v !== null,
  )

  if (scores.length === 0) return null

  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
  return Math.round(avg * 10) / 10
}

// ---------------------------------------------------------------------------
// getRatingBreakdown — per-category scores for bar chart
// ---------------------------------------------------------------------------

export function getRatingBreakdown(
  ratings: Partial<PlaceRatingsInput>,
): { category: RatingCategory; label: string; score: number | null }[] {
  return RATING_CATEGORIES.map(({ key, label }) => ({
    category: key as RatingCategory,
    label,
    score: ratings[key as RatingCategory] ?? null,
  }))
}
