/**
 * BottomTabBar — Custom floating glass pill tab bar.
 * 4 tabs, spring bounce active indicator, glassmorphic floating pill.
 */

import React, { memo, useCallback } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily } from '@theme/typography'
import { springs } from '@theme/animations'
import { useUIStore } from '@stores/uiStore'

interface TabBarProps {
  state: {
    index: number
    routes: { key: string; name: string }[]
  }
  descriptors: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>
  navigation: {
    emit: (args: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean }
    navigate: (name: string) => void
  }
}

// Custom SVG icon paths (unique, not from icon library)
const TAB_ICONS: Record<string, { path: string; viewBox?: string }> = {
  map: {
    path: 'M3 6 L9 3 L15 6 L21 3 V18 L15 21 L9 18 L3 21 V6 M9 3 V18 M15 6 V21',
  },
  explore: {
    path: 'M12 2 C6.5 2 2 6.5 2 12 S6.5 22 12 22 S22 17.5 22 12 S17.5 2 12 2 M12 6 L13.5 10.5 L18 12 L13.5 13.5 L12 18 L10.5 13.5 L6 12 L10.5 10.5 Z',
  },
  groups: {
    path: 'M17 21 V19 C17 17.9 16.1 17 15 17 H9 C7.9 17 7 17.9 7 19 V21 M12 13 C14.2 13 16 11.2 16 9 C16 6.8 14.2 5 12 5 C9.8 5 8 6.8 8 9 C8 11.2 9.8 13 12 13 M20 8 C21.1 8.5 22 9.7 22 11 C22 12.3 21.1 13.5 20 14 M4 8 C2.9 8.5 2 9.7 2 11 C2 12.3 2.9 13.5 4 14',
  },
  profile: {
    path: 'M20 21 V19 C20 17.3 18.7 16 17 16 H7 C5.3 16 4 17.3 4 19 V21 M12 13 C14.7 13 17 10.8 17 8 C17 5.2 14.8 3 12 3 C9.2 3 7 5.2 7 8 C7 10.8 9.3 13 12 13',
  },
}

const TAB_ROUTE_MAP: Record<string, string> = {
  map: 'map',
  explore: 'explore',
  groups: 'groups',
  profile: 'profile',
}

interface TabIconProps {
  routeName: string
  isActive: boolean
  size?: number
}

function TabIcon({ routeName, isActive, size = 26 }: TabIconProps) {
  const iconKey = Object.keys(TAB_ROUTE_MAP).find((k) =>
    routeName.toLowerCase().includes(k),
  ) ?? 'map'
  const iconDef = TAB_ICONS[iconKey] ?? TAB_ICONS.map
  const strokeColor = isActive ? colors.accentTeal : 'rgba(255,255,255,0.55)'

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={iconDef.path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isActive ? 1.8 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function BottomTabBarInner({ state, descriptors, navigation }: TabBarProps) {
  const activeDrillDownCity = useUIStore((s) => s.activeDrillDownCity)
  const insets = useSafeAreaInsets()
  if (activeDrillDownCity) return null

  return (
    <View style={[styles.outerContainer, { bottom: Math.max(12, insets.bottom + 4) }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index
          const descriptor = descriptors[route.key]
          const label = descriptor?.options?.title ?? route.name

          return (
            <TabItem
              key={route.key}
              routeKey={route.key}
              routeName={route.name}
              label={label}
              isActive={isActive}
              navigation={navigation}
              accessibilityLabel={descriptor?.options?.tabBarAccessibilityLabel}
            />
          )
        })}
      </View>
    </View>
  )
}

interface TabItemProps {
  routeKey: string
  routeName: string
  label: string
  isActive: boolean
  navigation: TabBarProps['navigation']
  accessibilityLabel?: string
}

function TabItem({
  routeKey,
  routeName,
  label,
  isActive,
  navigation,
  accessibilityLabel,
}: TabItemProps) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync()

    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    })

    if (!event.defaultPrevented) {
      navigation.navigate(routeName)
    }

    scale.value = withSpring(1.15, springs.bouncy, () => {
      scale.value = withSpring(1, springs.standard)
    })
  }, [navigation, routeKey, routeName, scale])

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Animated.View style={[styles.tabContent, animStyle]}>
        <TabIcon routeName={routeName} isActive={isActive} />
        <Text style={[styles.tabLabel, isActive && styles.activeLabel]} numberOfLines={1}>
          {label}
        </Text>
        {isActive && <View style={styles.activeDot} />}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8,10,18,0.95)',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      } as Record<string, string>,
      default: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    minWidth: 60,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  tabContent: {
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: colors.accentTeal,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentTeal,
    opacity: 0.7,
  },
})

export const BottomTabBar = memo(BottomTabBarInner)
