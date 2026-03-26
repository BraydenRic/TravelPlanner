/**
 * Authentication module — Driftmark
 *
 * Provides Supabase client initialization, Google OAuth sign-in/out,
 * session management, and inactivity timeout enforcement.
 *
 * Security mitigations implemented here:
 *   AS-01-A: expo-secure-store for token storage (not AsyncStorage)
 *   AS-01-B: autoRefreshToken keeps sessions alive transparently
 *   AS-01-C: 30-day inactivity timeout enforced via checkSessionTimeout()
 *   AS-07-A: JWT is always included in Supabase client requests automatically
 *
 * See THREAT_MODEL.md AS-01, TOP-3.
 */

import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Use the single shared Supabase client — never create a second instance.
// Two separate clients share the same SecureStore keys but maintain separate
// in-memory state, so auth events (login/logout) fired on one client are
// never received by listeners on the other.
export { supabase } from '@lib/supabase'
import { supabase } from '@lib/supabase'

// ---------------------------------------------------------------------------
// Google OAuth sign-in
// ---------------------------------------------------------------------------
// Mitigates AS-01 T-01-A (M-01-A): use OAuth (no password to steal/phish).
// The redirect URI must be registered in Google Cloud Console and Supabase
// Auth settings. Using a custom scheme (driftmark://) prevents open redirect.

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Platform.OS === 'web'
    ? `${window.location.origin}/auth/callback`
    : 'driftmark://auth/callback'

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) throw new AuthError('Google sign-in failed', error)
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------
// Invalidates the session on the Supabase server and clears SecureStore.

export async function signOut(): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync('last_activity').catch(() => {})
  }

  const { error } = await supabase.auth.signOut()
  if (error) throw new AuthError('Sign-out failed', error)
}

// ---------------------------------------------------------------------------
// Session accessors
// ---------------------------------------------------------------------------

/**
 * Returns the current session, or null if not authenticated.
 * Prefer getSession() over getUser() for non-critical checks (no network call).
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw new AuthError('Failed to get session', error)
  return session
}

/**
 * Returns the current user by making a network request to verify the JWT.
 * Use this when you need a guaranteed-fresh user object (e.g., before DB writes).
 * Mitigates AS-01 T-01-C: validates JWT server-side rather than trusting local state.
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw new AuthError('Failed to get user', error)
  return user
}

// ---------------------------------------------------------------------------
// Session timeout
// ---------------------------------------------------------------------------
// Mitigates AS-01 T-01-D (M-01-D): automatically sign out after 30 days of
// inactivity. This limits the window of exposure if a device is lost or stolen
// without a screen lock, as the refresh token remains valid indefinitely
// unless explicitly revoked or the inactivity window is exceeded.
//
// Call checkSessionTimeout() at app foreground / navigation entry points.

const SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
const LAST_ACTIVITY_KEY = 'last_activity'

/**
 * Checks whether the user has been inactive for longer than SESSION_TIMEOUT_MS.
 * If so, signs them out and throws an AuthError.
 * Updates the last activity timestamp on every call.
 */
export async function checkSessionTimeout(): Promise<void> {
  if (Platform.OS === 'web') return // Web sessions managed by Supabase natively

  const lastActivityStr = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY)

  if (!lastActivityStr) {
    await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, Date.now().toString())
    return
  }

  const lastActivity = parseInt(lastActivityStr, 10)
  if (isNaN(lastActivity)) {
    await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, Date.now().toString())
    return
  }

  if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
    await signOut()
    throw new AuthError('Session expired due to inactivity', null)
  }

  await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, Date.now().toString())
}

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
