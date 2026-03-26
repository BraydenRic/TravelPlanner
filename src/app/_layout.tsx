/**
 * Root Layout — Wraps entire app with ErrorBoundary and auth listener.
 */

import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { useAuthStore } from '@stores/authStore'
import { ErrorBoundary } from '@lib/errorBoundary'

export default function RootLayout() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

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
