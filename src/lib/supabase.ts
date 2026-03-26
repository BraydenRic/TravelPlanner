import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { Database } from './database'

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl as string
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration. Check your environment variables.')
}

// Platform-appropriate storage
// Native: expo-secure-store (encrypted, hardware-backed)
// Web: sessionStorage (tab-scoped, clears on close, smaller XSS blast radius than localStorage)
const storage =
  Platform.OS !== 'web'
    ? {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      }
    : typeof window !== 'undefined'
      ? window.sessionStorage
      : undefined

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})

/**
 * Type-erased database client for use in service files.
 *
 * The Supabase v2 generic type system requires CLI-generated types to work
 * correctly with .from() / .rpc() query builder chains. Hand-rolled types
 * cause inference failures in complex generic conditionals. Service functions
 * carry explicit return-type annotations that preserve type safety for consumers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any

export type SupabaseClient = typeof supabase
