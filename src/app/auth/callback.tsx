/**
 * OAuth callback route — handles the redirect from Google OAuth.
 * Supabase picks up the token from the URL automatically when detectSessionInUrl is true.
 * This screen just shows a loading state while the session is established.
 */

import React, { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@lib/auth'
import { colors } from '@theme/colors'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Wait for Supabase to process the OAuth tokens from the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/(tabs)/map')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accentTeal} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 16,
  },
})
