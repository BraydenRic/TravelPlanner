/**
 * Root Layout — Wraps entire app with ErrorBoundary and auth listener.
 */

import { Stack, router } from 'expo-router'
import { useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { useAuthStore } from '@stores/authStore'
import { ErrorBoundary } from '@lib/errorBoundary'
import { getProfile } from '@services/profiles'

export default function RootLayout() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const profile = await getProfile(session.user.id).catch(() => null)
        setProfile(profile)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const profile = await getProfile(session.user.id).catch(() => null)
        setProfile(profile)
      } else {
        setProfile(null)
        router.replace('/(auth)/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading])

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#07080D' },
          animation: 'fade',
        }}
      />
    </ErrorBoundary>
  )
}
