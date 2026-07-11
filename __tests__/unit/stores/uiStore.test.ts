/**
 * Unit tests — useUIStore
 *
 * Tests all actions and state transitions on the Zustand UI store.
 */

import { useUIStore } from '@stores/uiStore'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Reset to a known state before each test
beforeEach(() => {
  // Re-initialise by calling each action to their defaults
  const store = useUIStore.getState()
  store.setActiveCategory('been')
  store.clearDrillDown()
})

// ---------------------------------------------------------------------------
// setDrillDown
// ---------------------------------------------------------------------------

describe('useUIStore — setDrillDown', () => {
  it('setDrillDown(countryCode, cityId): sets both values', () => {
    useUIStore.getState().setDrillDown('JP', 'city-tokyo')

    const state = useUIStore.getState()
    expect(state.activeDrillDownCountry).toBe('JP')
    expect(state.activeDrillDownCity).toBe('city-tokyo')
  })

  it('setDrillDown with only countryCode: cityId defaults to null', () => {
    useUIStore.getState().setDrillDown('FR')

    const state = useUIStore.getState()
    expect(state.activeDrillDownCountry).toBe('FR')
    expect(state.activeDrillDownCity).toBeNull()
  })

  it('replaces previous drill-down values', () => {
    useUIStore.getState().setDrillDown('JP', 'city-tokyo')
    useUIStore.getState().setDrillDown('FR', 'city-paris')

    const state = useUIStore.getState()
    expect(state.activeDrillDownCountry).toBe('FR')
    expect(state.activeDrillDownCity).toBe('city-paris')
  })
})

// ---------------------------------------------------------------------------
// clearDrillDown
// ---------------------------------------------------------------------------

describe('useUIStore — clearDrillDown', () => {
  it('resets both activeDrillDownCountry and activeDrillDownCity to null', () => {
    useUIStore.getState().setDrillDown('JP', 'city-tokyo')
    useUIStore.getState().clearDrillDown()

    const state = useUIStore.getState()
    expect(state.activeDrillDownCountry).toBeNull()
    expect(state.activeDrillDownCity).toBeNull()
  })

  it('is a no-op when drill-down is already cleared', () => {
    useUIStore.getState().clearDrillDown()

    expect(useUIStore.getState().activeDrillDownCountry).toBeNull()
    expect(useUIStore.getState().activeDrillDownCity).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// setActiveCategory
// ---------------------------------------------------------------------------

describe('useUIStore — setActiveCategory', () => {
  it('updates the active map category', () => {
    useUIStore.getState().setActiveCategory('want_to_go')
    expect(useUIStore.getState().activeCategory).toBe('want_to_go')

    useUIStore.getState().setActiveCategory('lived')
    expect(useUIStore.getState().activeCategory).toBe('lived')
  })
})
