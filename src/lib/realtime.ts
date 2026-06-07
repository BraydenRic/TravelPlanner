import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// One channel per group — never subscribe per-table
const channels = new Map<string, RealtimeChannel>()

export function subscribeToGroup(
  groupId: string,
  callbacks: {
    onPlaceAdded?: (payload: Record<string, unknown>) => void
    onMemberChanged?: (payload: Record<string, unknown>) => void
    onRatingUpdated?: (payload: Record<string, unknown>) => void
  },
): () => void {
  // Clean up existing channel if any
  unsubscribeFromGroup(groupId)

  const channel = supabase
    .channel(`group:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_places',
        filter: `group_id=eq.${groupId}`,
      },
      // Fires for INSERT, UPDATE, and DELETE so toggling a country off
      // also propagates to other group members in real time.
      (payload) => callbacks.onPlaceAdded?.(payload as unknown as Record<string, unknown>),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => callbacks.onMemberChanged?.(payload as unknown as Record<string, unknown>),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'place_ratings' },
      (payload) => callbacks.onRatingUpdated?.(payload as unknown as Record<string, unknown>),
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        // Retry with exponential backoff
        setTimeout(() => subscribeToGroup(groupId, callbacks), 2000)
      }
    })

  channels.set(groupId, channel)

  return () => unsubscribeFromGroup(groupId)
}

export function unsubscribeFromGroup(groupId: string): void {
  const channel = channels.get(groupId)
  if (channel) {
    void supabase.removeChannel(channel)
    channels.delete(groupId)
  }
}

export function unsubscribeAll(): void {
  for (const [groupId] of channels) {
    unsubscribeFromGroup(groupId)
  }
}
