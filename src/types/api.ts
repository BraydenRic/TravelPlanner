/**
 * API response types for Supabase RPC functions and aggregated data.
 *
 * These types represent the shape of data returned by database functions
 * defined in supabase/migrations/002_database_functions.sql.
 */

import type { MemberColor, PlaceCategory, RatingCategory } from './database';

// ---------------------------------------------------------------------------
// Country rating aggregations
// ---------------------------------------------------------------------------

/**
 * Aggregated ratings for a country for a single user.
 * Returned by: `compute_country_ratings(p_country_code, p_user_id)`
 */
export interface CountryRatings {
  country_code: string;
  overall_score: number;
  categories: Record<RatingCategory, number>;
  cities_rated: number;
  total_cities: number;
}

/**
 * Aggregated ratings for a country across all members of a group.
 * Returned by: `compute_group_country_ratings(p_group_id, p_country_code)`
 */
export interface GroupCountryRatings {
  country_code: string;
  group_average: Record<RatingCategory, number>;
  group_overall: number;
  member_ratings: {
    user_id: string;
    color: MemberColor;
    categories: Record<RatingCategory, number>;
    overall: number;
  }[];
}

// ---------------------------------------------------------------------------
// Travel statistics
// ---------------------------------------------------------------------------

/**
 * Comprehensive travel stats for a user.
 * Returned by: `get_travel_stats(p_user_id)`
 */
export interface TravelStats {
  countries_visited: number;
  cities_visited: number;
  countries_want: number;
  countries_lived: number;
  continents_visited: string[];
  world_percentage: number;
  average_global_rating: number;
}

// ---------------------------------------------------------------------------
// Map data
// ---------------------------------------------------------------------------

/**
 * Per-country fill intensity for the world map choropleth.
 * Returned by: `get_country_fill_intensity(p_user_id)`
 * Used to shade countries based on city coverage.
 */
export interface CountryFillIntensity {
  country_code: string;
  cities_visited: number;
  total_cities: number;
  fill_ratio: number;
}

/**
 * A single member's place data for group map rendering.
 */
export interface GroupMemberPlace {
  user_id: string;
  color: MemberColor;
  country_code: string;
  city_id: string | null;
  category: PlaceCategory;
}

/**
 * All member places for a group.
 * Returned by: `get_group_map_data(p_group_id)`
 */
export interface GroupMapData {
  group_id: string;
  members: {
    user_id: string;
    color: MemberColor;
    display_name: string;
  }[];
  places: GroupMemberPlace[];
}

// ---------------------------------------------------------------------------
// City status within a country
// ---------------------------------------------------------------------------

/**
 * A city's visited status for a user in a given country.
 * Returned by: `get_country_city_status(p_country_code, p_user_id)`
 */
export interface CityCityStatus {
  city_id: string;
  city_name: string;
  latitude: number;
  longitude: number;
  is_capital: boolean;
  population_rank: number;
  is_visited: boolean;
  category: PlaceCategory | null;
  overall_score: number | null;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Generic cursor-based pagination wrapper.
 * All list endpoints return this shape.
 * Always use cursor-based pagination — never offset-based (PERFORMANCE.md).
 */
export type PaginatedResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ---------------------------------------------------------------------------
// Share card data
// ---------------------------------------------------------------------------

/**
 * Data for generating a shareable travel summary card.
 * SECURITY (THREAT_MODEL M-10-C): Only non-sensitive fields included.
 * Never include budget, daily spend, or detailed category breakdowns.
 * The sharing path includes a cryptographically random component (M-10-D).
 */
export interface ShareCardData {
  countryCode: string;
  countryName: string;
  overallScore: number | null;
  visitCount: number;  // number of cities visited
  categoryHighlights: {
    category: string;
    score: number;
  }[];
  visitedDate: string | null;
  /** Storage path for the rendered card image — includes random component */
  storagePath: string | null;
  /** Signed URL with 7-day TTL — never expose public URL (M-10-C) */
  signedUrl: string | null;
}

// ---------------------------------------------------------------------------
// Supabase error type
// ---------------------------------------------------------------------------

/**
 * Normalized error type for all Supabase operations.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Result type for all service functions.
 * Use this pattern to avoid throwing errors across async boundaries.
 */
export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };
