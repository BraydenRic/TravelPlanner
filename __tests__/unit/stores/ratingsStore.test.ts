/**
 * Unit tests — useRatingsStore
 *
 * Tests all actions and selectors on the Zustand ratings store.
 */

import { useRatingsStore } from '@stores/ratingsStore'
import { createMockCountryRatings } from '@/../__tests__/factories'
import type { PlaceRatingsInput } from '@lib/validation'

// Reset store between tests
beforeEach(() => {
  useRatingsStore.getState().reset()
})

// ---------------------------------------------------------------------------
// setPlaceRatings
// ---------------------------------------------------------------------------

describe('useRatingsStore — setPlaceRatings', () => {
  it('stores ratings keyed by visitedPlaceId', () => {
    const ratings: PlaceRatingsInput = {
      overall_experience: 4,
      safety: 5,
      food_cuisine: 4,
      transportation: 3,
      friendliness: 5,
      affordability: 3,
      cleanliness: 4,
      nightlife_entertainment: 3,
      natural_beauty: 5,
      wifi_connectivity: 4,
    }

    useRatingsStore.getState().setPlaceRatings('place-123', ratings)

    const stored = useRatingsStore.getState().ratings['place-123']
    expect(stored).toBeDefined()
    expect(stored?.safety).toBe(5)
    expect(stored?.food_cuisine).toBe(4)
  })

  it('stores multiple places without overwriting each other', () => {
    const r1: Partial<PlaceRatingsInput> = { safety: 4 } as PlaceRatingsInput
    const r2: Partial<PlaceRatingsInput> = { safety: 2 } as PlaceRatingsInput

    useRatingsStore.getState().setPlaceRatings('place-1', r1 as PlaceRatingsInput)
    useRatingsStore.getState().setPlaceRatings('place-2', r2 as PlaceRatingsInput)

    expect(useRatingsStore.getState().ratings['place-1']?.safety).toBe(4)
    expect(useRatingsStore.getState().ratings['place-2']?.safety).toBe(2)
  })

  it('overwrites existing ratings for the same visitedPlaceId', () => {
    const original: Partial<PlaceRatingsInput> = { safety: 3 } as PlaceRatingsInput
    const updated: Partial<PlaceRatingsInput> = { safety: 5, food_cuisine: 4 } as PlaceRatingsInput

    useRatingsStore.getState().setPlaceRatings('place-1', original as PlaceRatingsInput)
    useRatingsStore.getState().setPlaceRatings('place-1', updated as PlaceRatingsInput)

    expect(useRatingsStore.getState().ratings['place-1']?.safety).toBe(5)
    expect(useRatingsStore.getState().ratings['place-1']?.food_cuisine).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// setCountryRatings
// ---------------------------------------------------------------------------

describe('useRatingsStore — setCountryRatings', () => {
  it('stores country ratings keyed by country_code', () => {
    const jpRatings = createMockCountryRatings('JP')
    useRatingsStore.getState().setCountryRatings('JP', jpRatings)

    const stored = useRatingsStore.getState().countryRatings['JP']
    expect(stored).toBeDefined()
    expect(stored?.country_code).toBe('JP')
    expect(stored?.overall_score).toBe(4.2)
  })

  it('stores multiple country ratings independently', () => {
    const jp = createMockCountryRatings('JP', { overall_score: 4.5 })
    const fr = createMockCountryRatings('FR', { overall_score: 3.8 })

    useRatingsStore.getState().setCountryRatings('JP', jp)
    useRatingsStore.getState().setCountryRatings('FR', fr)

    expect(useRatingsStore.getState().countryRatings['JP']?.overall_score).toBe(4.5)
    expect(useRatingsStore.getState().countryRatings['FR']?.overall_score).toBe(3.8)
  })
})

// ---------------------------------------------------------------------------
// getPlaceRatings
// ---------------------------------------------------------------------------

describe('useRatingsStore — getPlaceRatings', () => {
  it('returns correct ratings for a stored visitedPlaceId', () => {
    const ratings: Partial<PlaceRatingsInput> = { safety: 5 } as PlaceRatingsInput
    useRatingsStore.getState().setPlaceRatings('place-123', ratings as PlaceRatingsInput)

    const result = useRatingsStore.getState().getPlaceRatings('place-123')
    expect(result).toBeDefined()
    expect(result?.safety).toBe(5)
  })

  it('returns undefined if visitedPlaceId is not cached', () => {
    const result = useRatingsStore.getState().getPlaceRatings('nonexistent-place')
    expect(result).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getCountryRatings
// ---------------------------------------------------------------------------

describe('useRatingsStore — getCountryRatings', () => {
  it('returns correct ratings for a stored country_code', () => {
    const jp = createMockCountryRatings('JP')
    useRatingsStore.getState().setCountryRatings('JP', jp)

    const result = useRatingsStore.getState().getCountryRatings('JP')
    expect(result).toBeDefined()
    expect(result?.country_code).toBe('JP')
  })

  it('returns undefined if country_code is not cached', () => {
    const result = useRatingsStore.getState().getCountryRatings('ZZ')
    expect(result).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('useRatingsStore — reset', () => {
  it('clears all ratings and countryRatings', () => {
    const ratings: Partial<PlaceRatingsInput> = { safety: 4 } as PlaceRatingsInput
    useRatingsStore.getState().setPlaceRatings('place-1', ratings as PlaceRatingsInput)
    useRatingsStore.getState().setCountryRatings('JP', createMockCountryRatings('JP'))

    useRatingsStore.getState().reset()

    const state = useRatingsStore.getState()
    expect(Object.keys(state.ratings)).toHaveLength(0)
    expect(Object.keys(state.countryRatings)).toHaveLength(0)
    expect(state.isLoading).toBe(false)
  })
})
