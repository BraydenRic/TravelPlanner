/**
 * Root index — auth-based route guard.
 * Redirects to (auth)/login or (tabs)/map.
 */

import { Redirect } from 'expo-router'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useAuthStore } from '@stores/authStore'
import { colors } from '@theme/colors'

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accentTeal} size="large" />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/map" />
  }

  return <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bgL0,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
