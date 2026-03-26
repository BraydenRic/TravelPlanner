import { create } from 'zustand'
import type { PlaceCategory } from '@typedefs/database'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface UIState {
  activeCategory: PlaceCategory
  mapZoom: number
  activeDrillDownCountry: string | null
  activeDrillDownCity: string | null
  isOffline: boolean
  toasts: Toast[]
  // Actions
  setActiveCategory: (category: PlaceCategory) => void
  setMapZoom: (zoom: number) => void
  setDrillDown: (country: string, city?: string) => void
  clearDrillDown: () => void
  setOffline: (offline: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeCategory: 'been',
  mapZoom: 2,
  activeDrillDownCountry: null,
  activeDrillDownCity: null,
  isOffline: false,
  toasts: [],

  setActiveCategory: (activeCategory) => set({ activeCategory }),

  setMapZoom: (mapZoom) => set({ mapZoom }),

  setDrillDown: (country, city) =>
    set({
      activeDrillDownCountry: country,
      activeDrillDownCity: city ?? null,
    }),

  clearDrillDown: () =>
    set({ activeDrillDownCountry: null, activeDrillDownCity: null }),

  setOffline: (isOffline) => set({ isOffline }),

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Math.random().toString(36).slice(2) },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
