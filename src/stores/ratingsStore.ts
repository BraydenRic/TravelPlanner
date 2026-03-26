import { create } from 'zustand'
import type { PlaceRatingsInput } from '@lib/validation'
import type { CountryRatings } from '@typedefs/api'

interface RatingsState {
  ratings: Record<string, PlaceRatingsInput>       // keyed by visitedPlaceId
  countryRatings: Record<string, CountryRatings>   // keyed by countryCode
  isLoading: boolean
  // Actions
  setPlaceRatings: (visitedPlaceId: string, ratings: PlaceRatingsInput) => void
  setCountryRatings: (countryCode: string, ratings: CountryRatings) => void
  getPlaceRatings: (visitedPlaceId: string) => PlaceRatingsInput | undefined
  getCountryRatings: (countryCode: string) => CountryRatings | undefined
  reset: () => void
}

export const useRatingsStore = create<RatingsState>((set, get) => ({
  ratings: {},
  countryRatings: {},
  isLoading: false,

  setPlaceRatings: (visitedPlaceId, ratings) =>
    set((state) => ({
      ratings: { ...state.ratings, [visitedPlaceId]: ratings },
    })),

  setCountryRatings: (countryCode, countryRatings) =>
    set((state) => ({
      countryRatings: { ...state.countryRatings, [countryCode]: countryRatings },
    })),

  getPlaceRatings: (visitedPlaceId) => get().ratings[visitedPlaceId],

  getCountryRatings: (countryCode) => get().countryRatings[countryCode],

  reset: () => set({ ratings: {}, countryRatings: {}, isLoading: false }),
}))
