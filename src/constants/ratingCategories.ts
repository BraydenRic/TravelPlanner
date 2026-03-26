/**
 * Rating category definitions for Driftmark.
 *
 * These map directly to the `rating_category` enum in the database.
 * The `key` values must match the RatingCategory union type in src/types/database.ts.
 */

export const RATING_CATEGORIES = [
  { key: 'overall_experience', label: 'Overall Experience', icon: 'compass' },
  { key: 'safety', label: 'Safety', icon: 'shield' },
  { key: 'food_cuisine', label: 'Food & Cuisine', icon: 'utensils' },
  { key: 'transportation', label: 'Transportation', icon: 'train' },
  { key: 'friendliness', label: 'Friendliness', icon: 'handshake' },
  { key: 'affordability', label: 'Affordability', icon: 'coins' },
  { key: 'cleanliness', label: 'Cleanliness', icon: 'sparkles' },
  { key: 'nightlife_entertainment', label: 'Nightlife & Entertainment', icon: 'music' },
  { key: 'natural_beauty', label: 'Natural Beauty', icon: 'mountain' },
  { key: 'wifi_connectivity', label: 'Wi-Fi & Connectivity', icon: 'wifi' },
] as const

export type RatingCategoryKey = (typeof RATING_CATEGORIES)[number]['key']

/** Total number of rating categories — useful for progress calculation. */
export const RATING_CATEGORY_COUNT = RATING_CATEGORIES.length
