/**
 * Places service — CRUD for visited_places with cursor-based pagination.
 *
 * Security:
 *   - All text inputs are sanitized before DB operations (AS-06)
 *   - Zod validation runs before any DB call (AS-06)
 *   - Never uses select('*') — only requests needed columns
 *   - RLS enforced server-side; user_id scoping done client-side for defense-in-depth
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError } from '@lib/apiErrors'
import {
  createPlaceSchema,
  updatePlaceSchema,
  countryCodeSchema,
  type CreatePlaceInput,
  type UpdatePlaceInput,
} from '@lib/validation'
import { sanitizeReview, sanitizeNotes } from '@lib/sanitize'
import type { VisitedPlace, PlaceCategory, City } from '@typedefs/database'
import type { PaginatedResponse, CountryFillIntensity } from '@typedefs/api'

// ---------------------------------------------------------------------------
// Column selections — never use select('*')
// ---------------------------------------------------------------------------

const PLACE_LIST_COLUMNS =
  'id, user_id, country_code, city_id, category, overall_score, visited_date, planned_date, created_at'

const PLACE_FULL_COLUMNS =
  'id, user_id, country_code, city_id, category, overall_score, review, visited_date, planned_date, planned_budget, daily_budget, currency_code, notes, created_at, updated_at'

// ---------------------------------------------------------------------------
// getPlaces — paginated list
// ---------------------------------------------------------------------------

export async function getPlaces(
  userId: string,
  category?: PlaceCategory,
  cursor?: string,
  limit = 20,
): Promise<PaginatedResponse<VisitedPlace>> {
  let query = supabase
    .from('visited_places')
    .select(PLACE_LIST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // fetch one extra to check if there are more

  if (category) {
    query = query.eq('category', category)
  }

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) throw handleSupabaseError(error)

  const rows = (data ?? []) as VisitedPlace[]
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (items[limit - 1]?.created_at ?? null) : null

  return { data: items, nextCursor, hasMore }
}

// ---------------------------------------------------------------------------
// getPlace — single place by ID
// ---------------------------------------------------------------------------

export async function getPlace(id: string): Promise<VisitedPlace> {
  const { data, error } = await supabase
    .from('visited_places')
    .select(PLACE_FULL_COLUMNS)
    .eq('id', id)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as VisitedPlace
}

// ---------------------------------------------------------------------------
// getPlaceByCountryAndCity — find existing visit
// ---------------------------------------------------------------------------

export async function getPlaceByCountryAndCity(
  userId: string,
  countryCode: string,
  cityId: string | null,
): Promise<VisitedPlace | null> {
  let query = supabase
    .from('visited_places')
    .select(PLACE_FULL_COLUMNS)
    .eq('user_id', userId)
    .eq('country_code', countryCode)

  if (cityId === null) {
    query = query.is('city_id', null)
  } else {
    query = query.eq('city_id', cityId)
  }

  const { data, error } = await query.limit(1)

  if (error) throw handleSupabaseError(error)

  if (!data || data.length === 0) return null
  return data[0] as VisitedPlace
}

// ---------------------------------------------------------------------------
// createPlace
// ---------------------------------------------------------------------------

export async function createPlace(
  userId: string,
  input: CreatePlaceInput,
): Promise<VisitedPlace> {
  const validated = createPlaceSchema.parse(input)

  const sanitized = {
    ...validated,
    review: validated.review ? sanitizeReview(validated.review) : null,
    notes: validated.notes ? sanitizeNotes(validated.notes) : null,
  }

  const { data, error } = await supabase
    .from('visited_places')
    .insert({
      user_id: userId,
      country_code: sanitized.country_code,
      city_id: sanitized.city_id ?? null,
      category: sanitized.category,
      review: sanitized.review ?? null,
      visited_date: sanitized.visited_date ?? null,
      planned_date: sanitized.planned_date ?? null,
      planned_budget: sanitized.planned_budget ?? null,
      daily_budget: sanitized.daily_budget ?? null,
      currency_code: sanitized.currency_code ?? null,
      notes: sanitized.notes ?? null,
    })
    .select(PLACE_FULL_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as VisitedPlace
}

// ---------------------------------------------------------------------------
// updatePlace
// ---------------------------------------------------------------------------

export async function updatePlace(
  id: string,
  userId: string,
  input: UpdatePlaceInput,
): Promise<VisitedPlace> {
  const validated = updatePlaceSchema.parse(input)

  const sanitized: Record<string, unknown> = { ...validated }
  if (typeof validated.review === 'string') {
    sanitized['review'] = sanitizeReview(validated.review)
  }
  if (typeof validated.notes === 'string') {
    sanitized['notes'] = sanitizeNotes(validated.notes)
  }

  const { data, error } = await supabase
    .from('visited_places')
    .update(sanitized)
    .eq('id', id)
    .eq('user_id', userId)
    .select(PLACE_FULL_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as VisitedPlace
}

// ---------------------------------------------------------------------------
// deletePlace
// ---------------------------------------------------------------------------

export async function deletePlace(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('visited_places')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw handleSupabaseError(error)
}

// ---------------------------------------------------------------------------
// getPlacesByCountry — all places for a country (no pagination)
// ---------------------------------------------------------------------------

export async function getPlacesByCountry(
  userId: string,
  countryCode: string,
): Promise<VisitedPlace[]> {
  // Validate country code to prevent injection
  countryCodeSchema.parse(countryCode)

  const { data, error } = await supabase
    .from('visited_places')
    .select(PLACE_FULL_COLUMNS)
    .eq('user_id', userId)
    .eq('country_code', countryCode)
    .order('visited_date', { ascending: false })

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as VisitedPlace[]
}

// ---------------------------------------------------------------------------
// getFillIntensity — calls get_country_fill_intensity RPC
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// getCitiesByCountry — publicly readable, no auth required
// ---------------------------------------------------------------------------

export async function getCityById(cityId: string): Promise<City | null> {
  const { data, error } = await supabase
    .from('cities')
    .select('id, country_code, name, latitude, longitude, population_rank, is_capital')
    .eq('id', cityId)
    .single()

  if (error) return null
  return data as City
}

export async function getCitiesByCountry(countryCode: string): Promise<City[]> {
  countryCodeSchema.parse(countryCode)

  const { data, error } = await supabase
    .from('cities')
    .select('id, country_code, name, latitude, longitude, population_rank, is_capital')
    .eq('country_code', countryCode)
    .order('population_rank')

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as City[]
}

// ---------------------------------------------------------------------------
// getFillIntensity — calls get_country_fill_intensity RPC
// ---------------------------------------------------------------------------

export async function getFillIntensity(userId: string): Promise<CountryFillIntensity[]> {
  const { data, error } = await supabase.rpc('get_country_fill_intensity', {
    p_user_id: userId,
  })

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as CountryFillIntensity[]
}
