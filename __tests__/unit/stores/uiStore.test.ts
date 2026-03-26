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
  store.setMapZoom(2)
  store.clearDrillDown()
  store.setOffline(false)
  // Clear all toasts by removing them individually
  const { toasts } = useUIStore.getState()
  toasts.forEach((t) => store.removeToast(t.id))
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
// addToast
// ---------------------------------------------------------------------------

describe('useUIStore — addToast', () => {
  it('adds a toast with a generated id', () => {
    useUIStore.getState().addToast({ message: 'Hello', type: 'success' })

    const { toasts } = useUIStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.message).toBe('Hello')
    expect(toasts[0]?.type).toBe('success')
    expect(toasts[0]?.id).toBeDefined()
    expect(typeof toasts[0]?.id).toBe('string')
    expect(toasts[0]?.id.length).toBeGreaterThan(0)
  })

  it('each toast gets a unique id', () => {
    useUIStore.getState().addToast({ message: 'Toast 1', type: 'info' })
    useUIStore.getState().addToast({ message: 'Toast 2', type: 'error' })

    const { toasts } = useUIStore.getState()
    expect(toasts).toHaveLength(2)
    expect(toasts[0]?.id).not.toBe(toasts[1]?.id)
  })

  it('preserves existing toasts when adding a new one', () => {
    useUIStore.getState().addToast({ message: 'First', type: 'success' })
    useUIStore.getState().addToast({ message: 'Second', type: 'error' })

    const { toasts } = useUIStore.getState()
    expect(toasts).toHaveLength(2)
    expect(toasts[0]?.message).toBe('First')
    expect(toasts[1]?.message).toBe('Second')
  })
})

// ---------------------------------------------------------------------------
// removeToast
// ---------------------------------------------------------------------------

describe('useUIStore — removeToast', () => {
  it('removes only the toast with the matching id', () => {
    useUIStore.getState().addToast({ message: 'Keep me', type: 'info' })
    useUIStore.getState().addToast({ message: 'Remove me', type: 'error' })

    const { toasts } = useUIStore.getState()
    const toRemove = toasts.find((t) => t.message === 'Remove me')!

    useUIStore.getState().removeToast(toRemove.id)

    const remaining = useUIStore.getState().toasts
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.message).toBe('Keep me')
  })

  it('is a no-op when id does not exist', () => {
    useUIStore.getState().addToast({ message: 'Toast', type: 'info' })
    useUIStore.getState().removeToast('nonexistent-id')

    expect(useUIStore.getState().toasts).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// setOffline
// ---------------------------------------------------------------------------

describe('useUIStore — setOffline', () => {
  it('sets isOffline to true', () => {
    useUIStore.getState().setOffline(true)
    expect(useUIStore.getState().isOffline).toBe(true)
  })

  it('sets isOffline to false', () => {
    useUIStore.getState().setOffline(true)
    useUIStore.getState().setOffline(false)
    expect(useUIStore.getState().isOffline).toBe(false)
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
