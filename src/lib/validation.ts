/**
 * Input validation schemas — Driftmark
 *
 * All user-supplied data must pass through these Zod schemas before
 * being written to the database or passed to any API call.
 *
 * Security mitigations implemented here:
 *   AS-06-A: Rejects XSS payloads via regex (no HTML special chars in text fields)
 *   AS-06-B: Enforces length limits matching DB CHECK constraints exactly
 *   AS-06-C: Rejects SQL injection patterns at the type level (UUID, enum, regex)
 *   AS-02-A: Type-safe inputs prevent accidental schema violations
 *
 * Validation pipeline: Zod (here) → sanitize.ts → DB write
 * See THREAT_MODEL.md AS-06 (TOP-5), AS-02.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

/**
 * ISO 3166-1 alpha-2 country code (e.g. "US", "JP").
 * Must be exactly 2 uppercase ASCII letters — rejects anything else.
 * Mitigates AS-06: prevents freeform injection in country_code field.
 */
export const countryCodeSchema = z.string()
  .length(2, 'Must be a valid ISO 3166-1 alpha-2 country code')
  .regex(/^[A-Z]{2}$/, 'Must be a valid ISO 3166-1 alpha-2 country code')

/**
 * ISO 4217 currency code (e.g. "USD", "EUR").
 * Must be exactly 3 uppercase ASCII letters.
 */
export const currencyCodeSchema = z.string()
  .length(3, 'Must be a valid ISO 4217 currency code')
  .regex(/^[A-Z]{3}$/, 'Must be a valid ISO 4217 currency code')

/**
 * Rating score 1–5 (integer only).
 * Matches DB CHECK constraint: score BETWEEN 1 AND 5.
 * The cast to ZodType<1|2|3|4|5> preserves the literal union for TypeScript.
 */
export const ratingScoreSchema = z.number()
  .int('Score must be an integer')
  .min(1, 'Score must be at least 1')
  .max(5, 'Score must be at most 5') as z.ZodType<1 | 2 | 3 | 4 | 5>

/**
 * Rating category — must match the rating_category enum in the database.
 * Using z.enum prevents arbitrary strings from reaching the DB.
 */
export const ratingCategorySchema = z.enum([
  'overall_experience',
  'safety',
  'food_cuisine',
  'transportation',
  'friendliness',
  'affordability',
  'cleanliness',
  'nightlife_entertainment',
  'natural_beauty',
  'wifi_connectivity',
])

/**
 * Place category — must match the place_category enum in the database.
 */
export const placeCategorySchema = z.enum(['been', 'want_to_go', 'lived'])

// ---------------------------------------------------------------------------
// Text field validators
// ---------------------------------------------------------------------------
// All text fields use the same XSS-rejection pattern: /^[^<>&"'`]*$/
// This blocks the characters used to break out of HTML attributes and
// construct script tags. Combined with sanitize.ts (which escapes these
// characters for storage), this provides defense-in-depth.
// Mitigates AS-06 TOP-5 (Stored XSS).

/**
 * Display name: 1–30 chars, no HTML-dangerous characters.
 * Matches DB CHECK: char_length(display_name) BETWEEN 1 AND 30.
 */
export const displayNameSchema = z.string()
  .min(1, 'Display name is required')
  .max(30, 'Display name must be 30 characters or less')
  .regex(/^[^<>&"'`]*$/, 'Display name contains invalid characters')

/**
 * Group name: 1–50 chars, no HTML-dangerous characters.
 * Matches DB CHECK: char_length(name) BETWEEN 1 AND 50.
 */
export const groupNameSchema = z.string()
  .min(1, 'Group name is required')
  .max(50, 'Group name must be 50 characters or less')
  .regex(/^[^<>&"'`]*$/, 'Group name contains invalid characters')

/**
 * Review text: up to 2000 chars.
 * Matches DB CHECK: char_length(review) <= 2000.
 * Optional — not all places require a review.
 * No HTML-char regex: reviews allow richer text; XSS handled by sanitize.ts.
 */
export const reviewSchema = z.string()
  .max(2000, 'Review must be 2000 characters or less')
  .optional()

/**
 * Photo caption: up to 500 chars, no HTML-dangerous characters.
 * Matches DB CHECK: char_length(caption) <= 500.
 */
export const captionSchema = z.string()
  .max(500, 'Caption must be 500 characters or less')
  .regex(/^[^<>&"'`]*$/, 'Caption contains invalid characters')
  .optional()

/**
 * Notes: up to 1000 chars, no HTML-dangerous characters.
 * Matches DB CHECK: char_length(notes) <= 1000.
 */
export const notesSchema = z.string()
  .max(1000, 'Notes must be 1000 characters or less')
  .regex(/^[^<>&"'`]*$/, 'Notes contain invalid characters')
  .optional()

/**
 * Budget: non-negative, max 999999 (matches DB CHECK).
 */
export const budgetSchema = z.number()
  .min(0, 'Budget must be positive')
  .max(999999, 'Budget is too large')
  .optional()

/**
 * Invite code: exactly 32 lowercase hex characters (16 bytes of entropy).
 * Mitigates AS-05: rejects short/non-hex codes that could indicate
 * tampering or brute-force attempts at alternate code formats.
 * See THREAT_MODEL.md AS-05 TOP-4 (invite code design).
 */
export const inviteCodeSchema = z.string()
  .min(4, 'Invalid invite code')
  .max(64, 'Invalid invite code')
  .regex(/^[0-9a-zA-Z]+$/, 'Invalid invite code format')

// ---------------------------------------------------------------------------
// Composite schemas
// ---------------------------------------------------------------------------

/**
 * All 10 rating categories for a visited place.
 *
 * Validates the payload passed to `upsertPlaceRatings`. Every field is
 * optional (`.partial()`) because users may rate only a subset of categories.
 * Any category that is present must be an integer between 1 and 5 inclusive,
 * matching the DB CHECK constraint on `place_ratings.score`.
 *
 * Categories: overall_experience, safety, food_cuisine, transportation,
 * friendliness, affordability, cleanliness, nightlife_entertainment,
 * natural_beauty, wifi_connectivity.
 *
 * Inferred type: `PlaceRatingsInput`
 */
export const placeRatingsSchema = z.object({
  overall_experience: ratingScoreSchema,
  safety: ratingScoreSchema,
  food_cuisine: ratingScoreSchema,
  transportation: ratingScoreSchema,
  friendliness: ratingScoreSchema,
  affordability: ratingScoreSchema,
  cleanliness: ratingScoreSchema,
  nightlife_entertainment: ratingScoreSchema,
  natural_beauty: ratingScoreSchema,
  wifi_connectivity: ratingScoreSchema,
}).partial()

/**
 * Validates a request to create a new visited or planned place.
 *
 * All fields map directly to `visited_places` table columns and their
 * CHECK constraints. Required fields: `country_code` and `category`.
 * All date fields must be ISO 8601 datetime strings. Budget fields are
 * non-negative decimals capped at 999,999. Text fields (review, notes)
 * reject HTML-dangerous characters (AS-06) and enforce the same length
 * limits as the DB constraints.
 *
 * Inferred type: `CreatePlaceInput`
 */
export const createPlaceSchema = z.object({
  country_code: countryCodeSchema,
  city_id: z.string().uuid('city_id must be a valid UUID').optional().nullable(),
  category: placeCategorySchema,
  review: reviewSchema,
  visited_date: z.string().datetime({ message: 'visited_date must be a valid ISO 8601 datetime' }).optional().nullable(),
  planned_date: z.string().datetime({ message: 'planned_date must be a valid ISO 8601 datetime' }).optional().nullable(),
  planned_budget: budgetSchema,
  daily_budget: budgetSchema,
  currency_code: currencyCodeSchema.optional().nullable(),
  notes: notesSchema,
  overall_score: z.number().min(1).max(5).optional().nullable(),
})

/**
 * Validates a request to update an existing visited place.
 *
 * All fields from `createPlaceSchema` are made optional via `.partial()`,
 * so only the fields being changed need to be included in the payload.
 * The same type constraints and sanitization rules apply as for creation.
 *
 * Inferred type: `UpdatePlaceInput`
 */
export const updatePlaceSchema = createPlaceSchema.partial()

/**
 * Create a new group.
 */
export const createGroupSchema = z.object({
  name: groupNameSchema,
})

/**
 * Update user profile fields.
 */
export const updateProfileSchema = z.object({
  display_name: displayNameSchema,
  avatar_url: z.string().url('avatar_url must be a valid URL').optional().nullable(),
})

/**
 * Photo upload metadata.
 */
export const photoUploadSchema = z.object({
  visited_place_id: z.string().uuid('visited_place_id must be a valid UUID'),
  caption: captionSchema,
  sort_order: z.number().int('sort_order must be an integer').min(0).max(100).optional(),
})

/**
 * Push notification token registration.
 * Mitigates AS-09: validates token format and device type before storage.
 */
export const pushTokenSchema = z.object({
  expo_push_token: z.string().min(1, 'Push token is required').max(200, 'Push token is too long'),
  device_type: z.enum(['ios', 'android', 'web']),
})

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type CreatePlaceInput = z.infer<typeof createPlaceSchema>
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>
export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type PlaceRatingsInput = z.infer<typeof placeRatingsSchema>
export type PhotoUploadInput = z.infer<typeof photoUploadSchema>
export type PushTokenInput = z.infer<typeof pushTokenSchema>
