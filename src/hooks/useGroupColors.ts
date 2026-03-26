/**
 * useGroupColors — Returns user→color mapping for a group.
 */

import { useMemo } from 'react'
import { useGroupStore } from '@stores/groupStore'
import type { MemberColor } from '@typedefs/database'

interface UserColorPair {
  userId: string
  color: MemberColor
}

export function useGroupColors(groupId?: string): UserColorPair[] {
  const { groupMembers } = useGroupStore()

  return useMemo(() => {
    if (!groupId) return []
    const members = groupMembers[groupId] ?? []
    return members.map((m) => ({ userId: m.user_id, color: m.color }))
  }, [groupId, groupMembers])
}
