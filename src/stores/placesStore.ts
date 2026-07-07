import { create } from 'zustand'
import type { VisitedPlace } from '@typedefs/database'
import type { CountryFillIntensity } from '@typedefs/api'

interface PlacesState {
  places: VisitedPlace[]
  fillIntensity: CountryFillIntensity[]
  isLoading: boolean
  error: string | null
  /**
   * True once the initial server fetch has landed (even if it returned zero
   * places). Screens use this to distinguish "still loading" from "genuinely
   * empty" — places.length alone can't tell those apart.
   */
  hydrated: boolean
  // Actions
  setPlaces: (places: VisitedPlace[]) => void
  addPlace: (place: VisitedPlace) => void
  updatePlace: (updated: VisitedPlace) => void
  removePlace: (id: string) => void
  setFillIntensity: (intensity: CountryFillIntensity[]) => void
  getPlacesByCountry: (countryCode: string) => VisitedPlace[]
  getPlaceByCity: (countryCode: string, cityId: string | null) => VisitedPlace | undefined
  reset: () => void
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  fillIntensity: [],
  isLoading: false,
  error: null,
  hydrated: false,

  setPlaces: (places) => set({ places, hydrated: true }),

  addPlace: (place) => set((state) => ({ places: [place, ...state.places] })),

  updatePlace: (updated) =>
    set((state) => ({
      places: state.places.map((p) => (p.id === updated.id ? updated : p)),
    })),

  removePlace: (id) =>
    set((state) => ({ places: state.places.filter((p) => p.id !== id) })),

  setFillIntensity: (fillIntensity) => set({ fillIntensity }),

  getPlacesByCountry: (countryCode) =>
    get().places.filter((p) => p.country_code === countryCode),

  getPlaceByCity: (countryCode, cityId) =>
    get().places.find(
      (p) =>
        p.country_code === countryCode &&
        (cityId === null ? p.city_id === null : p.city_id === cityId),
    ),

  reset: () =>
    set({ places: [], fillIntensity: [], isLoading: false, error: null, hydrated: false }),
}))
