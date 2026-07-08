/**
 * Root Layout — Wraps entire app with ErrorBoundary and auth listener.
 */

import { Stack, router } from 'expo-router'
import { useEffect } from 'react'
import { GestureRoot } from '@components/GestureRoot'
import { useFonts } from 'expo-font'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono'
import { supabase } from '@lib/supabase'
import { useAuthStore } from '@stores/authStore'
import { usePlacesStore } from '@stores/placesStore'
import { ErrorBoundary } from '@lib/errorBoundary'
import { initMonitoring } from '@lib/sentry'
import { getProfile } from '@services/profiles'
import { getPlaces } from '@services/places'
import type { VisitedPlace } from '@typedefs/database'

export default function RootLayout() {
  const { user, setUser, setProfile, setLoading } = useAuthStore()
  const { setPlaces } = usePlacesStore()

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono_400Regular,
  })

  // Error monitoring — no-op without EXPO_PUBLIC_SENTRY_DSN
  useEffect(() => {
    initMonitoring()
  }, [])

  // Auth state listener — sets user, only redirects on explicit sign-out
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setPlaces([])
        router.replace('/(auth)/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setPlaces, setLoading])

  // Load profile + places once user is known — runs after auth token is active
  useEffect(() => {
    if (!user) return
    void Promise.all([
      getProfile(user.id).catch(() => null),
      getPlaces(user.id, undefined, undefined, 500).catch(() => ({ data: [] as VisitedPlace[] })),
    ]).then(([profile, placesResult]) => {
      setProfile(profile)
      setPlaces(placesResult.data)
    })
  }, [user, setProfile, setPlaces])

  if (!fontsLoaded) return null

  return (
    // Root view for react-native-gesture-handler (passthrough on web) — the
    // map's pinch/pan/tap gestures silently never activate without it.
    <GestureRoot>
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#07080D' },
            animation: 'fade',
          }}
        />
      </ErrorBoundary>
    </GestureRoot>
  )
}
