/**
 * Unit tests — usePlacesStore
 *
 * Tests every action and selector on the Zustand places store.
 * Uses act() from @testing-library/react-hooks to keep state updates synchronous.
 */

import { usePlacesStore } from '@stores/placesStore'
import { createMockPlace } from '@/../__tests__/factories'
import type { CountryFillIntensity } from '@typedefs/api'

// Reset store state between tests to prevent leakage
beforeEach(() => {
  usePlacesStore.getState().reset()
})

// ---------------------------------------------------------------------------
// setPlaces
// ---------------------------------------------------------------------------

describe('usePlacesStore — setPlaces', () => {
  it('replaces entire places array', () => {
    const initial = [createMockPlace({ id: 'p1' }), createMockPlace({ id: 'p2' })]
    usePlacesStore.getState().setPlaces(initial)
    expect(usePlacesStore.getState().places).toHaveLength(2)

    const replacement = [createMockPlace({ id: 'p3' })]
    usePlacesStore.getState().setPlaces(replacement)

    const state = usePlacesStore.getState()
    expect(state.places).toHaveLength(1)
    expect(state.places[0]?.id).toBe('p3')
  })

  it('sets to empty array when called with []', () => {
    usePlacesStore.getState().setPlaces([createMockPlace()])
    usePlacesStore.getState().setPlaces([])
    expect(usePlacesStore.getState().places).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// addPlace
// ---------------------------------------------------------------------------

describe('usePlacesStore — addPlace', () => {
  it('appends a new place and preserves existing entries', () => {
    const p1 = createMockPlace({ id: 'p1' })
    const p2 = createMockPlace({ id: 'p2' })

    usePlacesStore.getState().setPlaces([p1])
    usePlacesStore.getState().addPlace(p2)

    const { places } = usePlacesStore.getState()
    expect(places).toHaveLength(2)
  })

  it('prepends the new place (newest-first ordering)', () => {
    const p1 = createMockPlace({ id: 'p1' })
    const p2 = createMockPlace({ id: 'p2' })

    usePlacesStore.getState().setPlaces([p1])
    usePlacesStore.getState().addPlace(p2)

    // addPlace prepends ([ p2, p1 ])
    expect(usePlacesStore.getState().places[0]?.id).toBe('p2')
  })
})

// ---------------------------------------------------------------------------
// updatePlace
// ---------------------------------------------------------------------------

describe('usePlacesStore — updatePlace', () => {
  it('mutates the correct item by id, leaves others unchanged', () => {
    const p1 = createMockPlace({ id: 'p1', review: 'Original' })
    const p2 = createMockPlace({ id: 'p2', review: 'Unchanged' })
    usePlacesStore.getState().setPlaces([p1, p2])

    const updated = { ...p1, review: 'Updated' }
    usePlacesStore.getState().updatePlace(updated)

    const { places } = usePlacesStore.getState()
    const found = places.find((p) => p.id === 'p1')
    const other = places.find((p) => p.id === 'p2')

    expect(found?.review).toBe('Updated')
    expect(other?.review).toBe('Unchanged')
  })

  it('does not change array length', () => {
    const p1 = createMockPlace({ id: 'p1' })
    const p2 = createMockPlace({ id: 'p2' })
    usePlacesStore.getState().setPlaces([p1, p2])

    usePlacesStore.getState().updatePlace({ ...p1, review: 'New' })

    expect(usePlacesStore.getState().places).toHaveLength(2)
  })

  it('is a no-op when id does not exist in the array', () => {
    const p1 = createMockPlace({ id: 'p1' })
    usePlacesStore.getState().setPlaces([p1])

    const ghost = createMockPlace({ id: 'ghost', review: 'Ghost' })
    usePlacesStore.getState().updatePlace(ghost)

    // p1 must be untouched; ghost should NOT have been added
    expect(usePlacesStore.getState().places).toHaveLength(1)
    expect(usePlacesStore.getState().places[0]?.id).toBe('p1')
  })
})

// ---------------------------------------------------------------------------
// removePlace
// ---------------------------------------------------------------------------

describe('usePlacesStore — removePlace', () => {
  it('removes the correct item by id', () => {
    const p1 = createMockPlace({ id: 'p1' })
    const p2 = createMockPlace({ id: 'p2' })
    const p3 = createMockPlace({ id: 'p3' })
    usePlacesStore.getState().setPlaces([p1, p2, p3])

    usePlacesStore.getState().removePlace('p2')

    const { places } = usePlacesStore.getState()
    expect(places).toHaveLength(2)
    expect(places.find((p) => p.id === 'p2')).toBeUndefined()
  })

  it('leaves array unchanged when id is not found', () => {
    const p1 = createMockPlace({ id: 'p1' })
    usePlacesStore.getState().setPlaces([p1])

    usePlacesStore.getState().removePlace('nonexistent')

    expect(usePlacesStore.getState().places).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// setFillIntensity
// ---------------------------------------------------------------------------

describe('usePlacesStore — setFillIntensity', () => {
  it('updates fill intensity array', () => {
    const intensity: CountryFillIntensity[] = [
      { country_code: 'JP', cities_visited: 3, total_cities: 12, fill_ratio: 0.25 },
      { country_code: 'US', cities_visited: 5, total_cities: 50, fill_ratio: 0.1 },
    ]

    usePlacesStore.getState().setFillIntensity(intensity)

    expect(usePlacesStore.getState().fillIntensity).toHaveLength(2)
    expect(usePlacesStore.getState().fillIntensity[0]?.country_code).toBe('JP')
  })
})

// ---------------------------------------------------------------------------
// getPlacesByCountry
// ---------------------------------------------------------------------------

describe('usePlacesStore — getPlacesByCountry', () => {
  it('filters places by country_code correctly', () => {
    const jp1 = createMockPlace({ id: 'jp1', country_code: 'JP' })
    const jp2 = createMockPlace({ id: 'jp2', country_code: 'JP' })
    const fr1 = createMockPlace({ id: 'fr1', country_code: 'FR' })
    usePlacesStore.getState().setPlaces([jp1, jp2, fr1])

    const jpPlaces = usePlacesStore.getState().getPlacesByCountry('JP')
    expect(jpPlaces).toHaveLength(2)
    expect(jpPlaces.every((p) => p.country_code === 'JP')).toBe(true)
  })

  it('returns empty array when no places match the country', () => {
    usePlacesStore.getState().setPlaces([createMockPlace({ country_code: 'JP' })])
    const result = usePlacesStore.getState().getPlacesByCountry('DE')
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getPlaceByCity
// ---------------------------------------------------------------------------

describe('usePlacesStore — getPlaceByCity', () => {
  it('finds place by both country_code AND city_id', () => {
    const p = createMockPlace({ country_code: 'JP', city_id: 'city-tokyo' })
    usePlacesStore.getState().setPlaces([p])

    const found = usePlacesStore.getState().getPlaceByCity('JP', 'city-tokyo')
    expect(found).toBeDefined()
    expect(found?.city_id).toBe('city-tokyo')
  })

  it('returns undefined when country matches but city does not', () => {
    usePlacesStore.getState().setPlaces([
      createMockPlace({ country_code: 'JP', city_id: 'city-tokyo' }),
    ])

    const found = usePlacesStore.getState().getPlaceByCity('JP', 'city-osaka')
    expect(found).toBeUndefined()
  })

  it('matches null cityId using null equality', () => {
    const p = createMockPlace({ country_code: 'JP', city_id: null })
    usePlacesStore.getState().setPlaces([p])

    const found = usePlacesStore.getState().getPlaceByCity('JP', null)
    expect(found).toBeDefined()
    expect(found?.city_id).toBeNull()
  })

  it('does not return null-city place when a specific cityId is requested', () => {
    const p = createMockPlace({ country_code: 'JP', city_id: null })
    usePlacesStore.getState().setPlaces([p])

    const found = usePlacesStore.getState().getPlaceByCity('JP', 'city-tokyo')
    expect(found).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('usePlacesStore — reset', () => {
  it('returns store to initial state', () => {
    usePlacesStore.getState().setPlaces([createMockPlace(), createMockPlace({ id: 'p2' })])
    usePlacesStore.getState().setFillIntensity([
      { country_code: 'JP', cities_visited: 1, total_cities: 5, fill_ratio: 0.2 },
    ])

    usePlacesStore.getState().reset()

    const state = usePlacesStore.getState()
    expect(state.places).toHaveLength(0)
    expect(state.fillIntensity).toHaveLength(0)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })
})
