import type {
  Profile,
  VisitedPlace,
  PlaceRating,
  Group,
  GroupMember,
  City,
  PlacePhoto,
  Achievement,
} from '@typedefs/database'
import type { CountryRatings, TravelStats } from '@typedefs/api'

export function createMockProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: 'user-123',
    google_id: 'google-123',
    display_name: 'Test User',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createMockPlace(overrides?: Partial<VisitedPlace>): VisitedPlace {
  return {
    id: 'place-123',
    user_id: 'user-123',
    country_code: 'JP',
    city_id: 'city-123',
    category: 'been',
    overall_score: 4.2,
    review: 'Great place',
    visited_date: '2024-06-01',
    planned_date: null,
    planned_budget: null,
    daily_budget: null,
    currency_code: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createMockRatings(
  overrides?: Partial<Record<string, number>>,
): Record<string, number> {
  return {
    overall_experience: 4,
    safety: 5,
    food_cuisine: 5,
    transportation: 4,
    friendliness: 4,
    affordability: 3,
    cleanliness: 5,
    nightlife_entertainment: 3,
    natural_beauty: 4,
    wifi_connectivity: 5,
    ...overrides,
  }
}

export function createMockGroup(overrides?: Partial<Group>): Group {
  return {
    id: 'group-123',
    name: 'Travel Crew',
    created_by: 'user-123',
    invite_code: 'abc123def456abc123def456abc123de', // 32 hex chars
    invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    color_scheme: {},
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createMockGroupMember(overrides?: Partial<GroupMember>): GroupMember {
  return {
    id: 'member-123',
    group_id: 'group-123',
    user_id: 'user-123',
    color: '#00F5D4',
    joined_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createMockCity(overrides?: Partial<City>): City {
  return {
    id: 'city-123',
    country_code: 'JP',
    name: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    population_rank: 1,
    is_capital: true,
    ...overrides,
  }
}

export function createMockPhoto(overrides?: Partial<PlacePhoto>): PlacePhoto {
  return {
    id: 'photo-123',
    visited_place_id: 'place-123',
    user_id: 'user-123',
    storage_path: 'place-photos/user-123/place-123/1234567890.jpg',
    thumbnail_path: 'place-photos/user-123/place-123/thumb_1234567890.jpg',
    caption: 'Beautiful view',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createMockTravelStats(overrides?: Partial<TravelStats>): TravelStats {
  return {
    countries_visited: 15,
    cities_visited: 42,
    countries_want: 8,
    countries_lived: 2,
    continents_visited: ['Asia', 'Europe', 'North America'],
    world_percentage: 7.7,
    average_global_rating: 4.1,
    ...overrides,
  }
}

export function createMockCountryRatings(
  countryCode = 'JP',
  overrides?: Partial<CountryRatings>,
): CountryRatings {
  return {
    country_code: countryCode,
    overall_score: 4.2,
    categories: {
      overall_experience: 4.5,
      safety: 5.0,
      food_cuisine: 4.8,
      transportation: 4.5,
      friendliness: 4.0,
      affordability: 3.2,
      cleanliness: 4.9,
      nightlife_entertainment: 3.5,
      natural_beauty: 4.2,
      wifi_connectivity: 4.8,
    },
    cities_rated: 4,
    total_cities: 12,
    ...overrides,
  }
}

export function createMockPlaceRating(overrides?: Partial<PlaceRating>): PlaceRating {
  return {
    id: 'rating-123',
    visited_place_id: 'place-123',
    category: 'overall_experience',
    score: 4,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createMockAchievement(overrides?: Partial<Achievement>): Achievement {
  return {
    id: 'achievement-123',
    user_id: 'user-123',
    badge_type: 'first_stamp',
    unlocked_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}
