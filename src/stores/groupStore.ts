import { create } from 'zustand'
import type { Group, GroupMember } from '@typedefs/database'
import type { GroupMemberPlace } from '@typedefs/api'

// Alias for clarity in store
type GroupMapEntry = GroupMemberPlace

interface GroupState {
  groups: Group[]
  activeGroupId: string | null
  groupMembers: Record<string, GroupMember[]>       // keyed by groupId
  groupMapData: Record<string, GroupMapEntry[]>     // keyed by groupId
  isLoading: boolean
  // Actions
  setGroups: (groups: Group[]) => void
  setActiveGroup: (groupId: string | null) => void
  setGroupMembers: (groupId: string, members: GroupMember[]) => void
  setGroupMapData: (groupId: string, data: GroupMapEntry[]) => void
  addGroup: (group: Group) => void
  removeGroup: (groupId: string) => void
  getActiveGroup: () => Group | undefined
  reset: () => void
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  activeGroupId: null,
  groupMembers: {},
  groupMapData: {},
  isLoading: false,

  setGroups: (groups) => set({ groups }),

  setActiveGroup: (activeGroupId) => set({ activeGroupId }),

  setGroupMembers: (groupId, members) =>
    set((state) => ({
      groupMembers: { ...state.groupMembers, [groupId]: members },
    })),

  setGroupMapData: (groupId, data) =>
    set((state) => ({
      groupMapData: { ...state.groupMapData, [groupId]: data },
    })),

  addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),

  removeGroup: (groupId) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      activeGroupId: state.activeGroupId === groupId ? null : state.activeGroupId,
    })),

  getActiveGroup: () => {
    const { groups, activeGroupId } = get()
    return groups.find((g) => g.id === activeGroupId)
  },

  reset: () =>
    set({
      groups: [],
      activeGroupId: null,
      groupMembers: {},
      groupMapData: {},
      isLoading: false,
    }),
}))
