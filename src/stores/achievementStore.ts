import { create } from 'zustand'
import type { Achievement } from '@typedefs/database'

interface AchievementState {
  achievements: Achievement[]
  newlyUnlocked: Achievement[]
  // Actions
  setAchievements: (achievements: Achievement[]) => void
  addAchievement: (achievement: Achievement) => void
  clearNewlyUnlocked: () => void
}

export const useAchievementStore = create<AchievementState>((set) => ({
  achievements: [],
  newlyUnlocked: [],

  setAchievements: (achievements) => set({ achievements }),

  addAchievement: (achievement) =>
    set((state) => ({
      achievements: [...state.achievements, achievement],
      newlyUnlocked: [...state.newlyUnlocked, achievement],
    })),

  clearNewlyUnlocked: () => set({ newlyUnlocked: [] }),
}))
