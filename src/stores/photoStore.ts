import { create } from 'zustand'
import type { PlacePhoto } from '@typedefs/database'

export interface UploadQueueItem {
  id: string
  visitedPlaceId: string
  fileUri: string
  caption?: string
  status: 'pending' | 'uploading' | 'failed'
}

interface PhotoState {
  photos: Record<string, PlacePhoto[]>             // keyed by visitedPlaceId
  isUploading: boolean
  uploadQueue: UploadQueueItem[]
  // Actions
  setPhotos: (visitedPlaceId: string, photos: PlacePhoto[]) => void
  addPhoto: (photo: PlacePhoto) => void
  removePhoto: (photoId: string, visitedPlaceId: string) => void
  addToUploadQueue: (item: UploadQueueItem) => void
  removeFromUploadQueue: (id: string) => void
}

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: {},
  isUploading: false,
  uploadQueue: [],

  setPhotos: (visitedPlaceId, photos) =>
    set((state) => ({
      photos: { ...state.photos, [visitedPlaceId]: photos },
    })),

  addPhoto: (photo) =>
    set((state) => {
      const existing = state.photos[photo.visited_place_id] ?? []
      return {
        photos: {
          ...state.photos,
          [photo.visited_place_id]: [...existing, photo].sort(
            (a, b) => a.sort_order - b.sort_order,
          ),
        },
      }
    }),

  removePhoto: (photoId, visitedPlaceId) =>
    set((state) => {
      const existing = state.photos[visitedPlaceId] ?? []
      return {
        photos: {
          ...state.photos,
          [visitedPlaceId]: existing.filter((p) => p.id !== photoId),
        },
      }
    }),

  addToUploadQueue: (item) =>
    set((state) => ({ uploadQueue: [...state.uploadQueue, item] })),

  removeFromUploadQueue: (id) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.filter((item) => item.id !== id),
    })),
}))
