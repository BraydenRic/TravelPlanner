import { create } from 'zustand'
import type { PlaceCategory } from '@typedefs/database'

interface UIState {
  activeCategory: PlaceCategory
  activeDrillDownCountry: string | null
  activeDrillDownCity: string | null
  // Actions
  setActiveCategory: (category: PlaceCategory) => void
  setDrillDown: (country: string, city?: string) => void
  clearDrillDown: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeCategory: 'been',
  activeDrillDownCountry: null,
  activeDrillDownCity: null,

  setActiveCategory: (activeCategory) => set({ activeCategory }),

  setDrillDown: (country, city) =>
    set({
      activeDrillDownCountry: country,
      activeDrillDownCity: city ?? null,
    }),

  clearDrillDown: () =>
    set({ activeDrillDownCountry: null, activeDrillDownCity: null }),
}))
