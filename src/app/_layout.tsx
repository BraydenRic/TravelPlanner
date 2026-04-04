/**
 * Root Layout — Wraps entire app with ErrorBoundary and auth listener.
 */

import { Stack, router } from 'expo-router'
import { useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { useAuthStore } from '@stores/authStore'
import { usePlacesStore } from '@stores/placesStore'
import { ErrorBoundary } from '@lib/errorBoundary'
import { getProfile } from '@services/profiles'
import { getPlaces } from '@services/places'
import type { Profile } from '@typedefs/database'
import type { VisitedPlace } from '@typedefs/database'

async function loadUserData(
  userId: string,
  setProfile: (p: Profile | null) => void,
  setPlaces: (p: VisitedPlace[]) => void,
) {
  const [profile, placesResult] = await Promise.all([
    getProfile(userId).catch(() => null),
    getPlaces(userId, undefined, undefined, 500).catch(() => ({ data: [] as VisitedPlace[] })),
  ])
  setProfile(profile)
  setPlaces(placesResult.data)
}

export default function RootLayout() {
  const { setUser, setProfile, setLoading } = useAuthStore()
  const { setPlaces } = usePlacesStore()

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadUserData(session.user.id, setProfile, setPlaces)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadUserData(session.user.id, setProfile, setPlaces)
      } else {
        setProfile(null)
        setPlaces([])
        router.replace('/(auth)/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setPlaces, setLoading])

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
