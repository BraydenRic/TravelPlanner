/**
 * Notifications service — register and manage Expo push tokens.
 *
 * Security:
 *   - Token format validated before storage (AS-09)
 *   - Access restricted to token owner by RLS
 */

import { db as supabase } from '@lib/supabase'
import { handleSupabaseError } from '@lib/apiErrors'
import { pushTokenSchema } from '@lib/validation'
import type { PushToken } from '@typedefs/database'

const PUSH_TOKEN_COLUMNS = 'id, user_id, expo_push_token, device_type, enabled, created_at'

// ---------------------------------------------------------------------------
// registerPushToken
// ---------------------------------------------------------------------------

export async function registerPushToken(
  userId: string,
  token: string,
  deviceType: 'ios' | 'android' | 'web',
): Promise<PushToken> {
  // Validate token format and device type
  pushTokenSchema.parse({ expo_push_token: token, device_type: deviceType })

  const { data, error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        expo_push_token: token,
        device_type: deviceType,
        enabled: true,
      },
      { onConflict: 'user_id' },
    )
    .select(PUSH_TOKEN_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as PushToken
}

// ---------------------------------------------------------------------------
// updateNotificationPreference
// ---------------------------------------------------------------------------

export async function updateNotificationPreference(
  userId: string,
  enabled: boolean,
): Promise<PushToken> {
  const { data, error } = await supabase
    .from('push_tokens')
    .update({ enabled })
    .eq('user_id', userId)
    .select(PUSH_TOKEN_COLUMNS)
    .single()

  if (error) throw handleSupabaseError(error)
  return data as PushToken
}

// ---------------------------------------------------------------------------
// getPushToken
// ---------------------------------------------------------------------------

export async function getPushToken(userId: string): Promise<PushToken | null> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select(PUSH_TOKEN_COLUMNS)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw handleSupabaseError(error)
  }

  return data as PushToken
}
