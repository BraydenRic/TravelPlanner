/**
 * Tab layout — uses custom BottomTabBar component.
 */

import { Redirect, Tabs } from 'expo-router'
import { BottomTabBar } from '@components/layout/BottomTabBar'
import { useAuthStore } from '@stores/authStore'
import { colors } from '@theme/colors'

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuthStore()

  // The index route redirects unauthenticated visitors, but deep links (a
  // typed URL on web, a notification tap) land here directly — never render
  // the authed app without a session.
  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...(props as unknown as Parameters<typeof BottomTabBar>[0])} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bgL0 },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarAccessibilityLabel: 'World Map',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarAccessibilityLabel: 'Explore Countries',
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarAccessibilityLabel: 'Travel Groups',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Your Profile',
        }}
      />
    </Tabs>
  )
}
