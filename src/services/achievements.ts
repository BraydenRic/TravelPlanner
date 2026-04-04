/**
 * Achievements service — check, unlock, and display badges.
 *
 * Security:
 *   - Achievements can only be written by DB SECURITY DEFINER functions
 *   - check_achievements RPC is the only write path
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError } from '@lib/apiErrors'
import type { Achievement, BadgeType } from '@typedefs/database'

// ---------------------------------------------------------------------------
// Badge metadata map
// ---------------------------------------------------------------------------

export interface BadgeMetadata {
  label: string
  description: string
  icon: string
}

export const BADGE_METADATA: Record<BadgeType, BadgeMetadata> = {
  first_stamp: {
    label: 'First Stamp',
    description: 'Added your first visited place to the map.',
    icon: 'stamp',
  },
  continental: {
    label: 'Continental',
    description: 'Visited at least one country on 3 or more continents.',
    icon: 'globe',
  },
  globe_trotter: {
    label: 'Globe Trotter',
    description: 'Visited countries on all 6 inhabited continents.',
    icon: 'globe-2',
  },
  critic: {
    label: 'Critic',
    description: 'Rated 10 or more visited places.',
    icon: 'star',
  },
  squad_goals: {
    label: 'Squad Goals',
    description: 'Joined or created a travel group.',
    icon: 'users',
  },
  home_away: {
    label: 'Home Away',
    description: 'Marked a country as lived-in.',
    icon: 'home',
  },
  city_explorer: {
    label: 'City Explorer',
    description: 'Visited 5 or more cities in a single country.',
    icon: 'building-2',
  },
  wanderer: {
    label: 'Wanderer',
    description: 'Visited 10 or more countries.',
    icon: 'footprints',
  },
  jet_setter: {
    label: 'Jet Setter',
    description: 'Visited 25 or more countries.',
    icon: 'plane',
  },
  urban_explorer: {
    label: 'Urban Explorer',
    description: 'Visited 50 or more cities.',
    icon: 'map-pin',
  },
  curator: {
    label: 'Curator',
    description: 'Rated 50 or more visited places.',
    icon: 'star-half',
  },
  nomad: {
    label: 'Nomad',
    description: 'Marked 3 or more countries as lived-in.',
    icon: 'tent',
  },
}

// ---------------------------------------------------------------------------
// checkAndUnlockAchievements
// ---------------------------------------------------------------------------

export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase.rpc('check_achievements', { p_user_id: userId })

  if (error) throw handleSupabaseError(error)

  const results = (data ?? []) as { badge_type: BadgeType; newly_unlocked: boolean }[]

  // Return only newly unlocked badges
  const newlyUnlocked = results.filter((r) => r.newly_unlocked)

  if (newlyUnlocked.length === 0) return []

  // Fetch the full achievement records for newly unlocked badges
  const badgeTypes = newlyUnlocked.map((r) => r.badge_type)
  const { data: achievements, error: fetchError } = await supabase
    .from('achievements')
    .select('id, user_id, badge_type, unlocked_at')
    .eq('user_id', userId)
    .in('badge_type', badgeTypes)

  if (fetchError) throw handleSupabaseError(fetchError)
  return (achievements ?? []) as Achievement[]
}

// ---------------------------------------------------------------------------
// getUserAchievements
// ---------------------------------------------------------------------------

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('id, user_id, badge_type, unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at')

  if (error) throw handleSupabaseError(error)
  return (data ?? []) as Achievement[]
}
