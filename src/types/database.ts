/**
 * Database row types for all Supabase tables.
 *
 * These types directly mirror the database schema defined in
 * supabase/migrations/001_initial_schema.sql.
 *
 * SECURITY NOTE: These types are for TypeScript compile-time safety only.
 * Authorization is enforced by Row Level Security policies in the database.
 * See THREAT_MODEL.md AS-02 and supabase/migrations/003_enable_rls.sql.
 */

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

/**
 * A user profile. Publicly readable (SELECT) but only self-editable.
 * Note: push_tokens and google_id are in separate restricted tables (THREAT_MODEL M-02-E).
 */
export interface Profile {
  id: string;
  google_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// cities (READ-ONLY reference data — pre-seeded, no user writes allowed)
// ---------------------------------------------------------------------------

/**
 * A city entry from the reference dataset.
 * SECURITY: No INSERT/UPDATE/DELETE RLS policies exist for this table.
 * Any write attempt will be rejected by the database (THREAT_MODEL M-02-C).
 */
export interface City {
  id: string;
  country_code: string;
  name: string;
  latitude: number;
  longitude: number;
  population_rank: number;
  is_capital: boolean;
}

// ---------------------------------------------------------------------------
// visited_places
// ---------------------------------------------------------------------------

/** Defines the type of travel record for a location. */
export type PlaceCategory = 'been' | 'want_to_go' | 'lived';

/**
 * A user's record of visiting (or planning to visit) a country or city.
 * RLS: Users can only read/write their own rows (THREAT_MODEL M-02-A).
 */
export interface VisitedPlace {
  id: string;
  user_id: string;
  country_code: string;
  city_id: string | null;
  category: PlaceCategory;
  overall_score: number | null;
  review: string | null;
  visited_date: string | null;
  planned_date: string | null;
  planned_budget: number | null;
  daily_budget: number | null;
  currency_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// place_ratings
// ---------------------------------------------------------------------------

/**
 * The categories for rating a place.
 * Must match the `rating_category` enum in the database.
 */
export type RatingCategory =
  | 'overall_experience'
  | 'safety'
  | 'food_cuisine'
  | 'transportation'
  | 'friendliness'
  | 'affordability'
  | 'cleanliness'
  | 'nightlife_entertainment'
  | 'natural_beauty'
  | 'wifi_connectivity';

/**
 * A single rating score for a specific category of a visited place.
 * RLS: Accessible only to the owner of the parent visited_place (THREAT_MODEL M-02-A).
 */
export interface PlaceRating {
  id: string;
  visited_place_id: string;
  category: RatingCategory;
  score: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

// ---------------------------------------------------------------------------
// groups
// ---------------------------------------------------------------------------

/**
 * A travel group (max 4 members enforced by DB trigger).
 * SECURITY: invite_code is hashed in the DB (THREAT_MODEL M-05-A).
 * The raw invite code is NEVER returned in queries — only returned once at creation.
 */
export interface Group {
  id: string;
  name: string;
  created_by: string;
  invite_code: string | null; // null after use or expiry (THREAT_MODEL M-05-B)
  invite_expires_at: string | null;
  color_scheme: Record<string, string>;
  created_at: string;
}

/** Available member colors for group map visualization. */
export type MemberColor = '#00F5D4' | '#F5A623' | '#A78BFA' | '#FF6B6B';

/**
 * A user's membership in a group.
 * RLS: Only readable by members of the same group (THREAT_MODEL M-02-B).
 */
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  color: MemberColor;
  joined_at: string;
}

/**
 * A place added to a group's shared map.
 * RLS: Only readable by members of the same group (THREAT_MODEL M-02-B).
 */
export interface GroupPlace {
  id: string;
  group_id: string;
  user_id: string;
  country_code: string;
  city_id: string | null;
  category: PlaceCategory;
  created_at: string;
}

// ---------------------------------------------------------------------------
// place_photos
// ---------------------------------------------------------------------------

/**
 * A photo attached to a visited place.
 * SECURITY: All photos must have EXIF GPS stripped before upload (THREAT_MODEL TOP-2, M-03-A).
 * storage_path is the original (full-res); thumbnail_path is for display.
 * Original images must only be served via short-lived signed URLs (THREAT_MODEL M-03-F).
 */
export interface PlacePhoto {
  id: string;
  visited_place_id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// achievements
// ---------------------------------------------------------------------------

/**
 * Badge types that can be unlocked.
 * Must match the `badge_type` enum in the database.
 */
export type BadgeType =
  | 'first_stamp'
  | 'continental'
  | 'globe_trotter'
  | 'critic'
  | 'squad_goals'
  | 'home_away'
  | 'city_explorer'
  | 'wanderer'
  | 'jet_setter'
  | 'urban_explorer'
  | 'curator'
  | 'nomad';

/**
 * A badge earned by a user.
 * SECURITY: No user-facing INSERT policy — only SECURITY DEFINER functions can write (THREAT_MODEL M-02-D).
 */
export interface Achievement {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  unlocked_at: string;
}

// ---------------------------------------------------------------------------
// push_tokens
// ---------------------------------------------------------------------------

/**
 * An Expo push token registered for a user's device.
 * SECURITY: RLS restricts access to the token owner only.
 * Service-role key (Edge Functions only) may read tokens for sending (THREAT_MODEL M-09-A).
 */
export interface PushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  device_type: 'ios' | 'android' | 'web';
  enabled: boolean;
  created_at: string;
}
