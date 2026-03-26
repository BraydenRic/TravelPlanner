/**
 * RatingToggle — Segmented control: My Rating / Group Average / Compare.
 * Animated sliding indicator with spring physics + overshoot.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, borderWidth, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'

export type RatingView = 'personal' | 'group' | 'compare'

interface RatingToggleProps {
  activeView: RatingView
  onChangeView: (view: RatingView) => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

const VIEWS: { key: RatingView; label: string }[] = [
  { key: 'personal', label: 'My Rating' },
  { key: 'group', label: 'Group' },
  { key: 'compare', label: 'Compare' },
]

function RatingToggleInner({
  activeView,
  onChangeView,
  disabled = false,
  style,
}: RatingToggleProps) {
  const tabWidths = useRef<Record<RatingView, number>>({
    personal: 0,
    group: 0,
    compare: 0,
  })
  const tabOffsets = useRef<Record<RatingView, number>>({
    personal: 0,
    group: 0,
    compare: 0,
  })
  const indicatorX = useSharedValue(0)
  const indicatorWidth = useSharedValue(0)

  const updateIndicator = useCallback(
    (key: RatingView) => {
      const w = tabWidths.current[key]
      const x = tabOffsets.current[key]
      if (w > 0) {
        indicatorX.value = withSpring(x, { ...springs.standard, overshootClamping: false })
        indicatorWidth.value = withSpring(w, springs.snappy)
      }
    },
    [indicatorX, indicatorWidth],
  )

  useEffect(() => {
    updateIndicator(activeView)
  }, [activeView, updateIndicator])

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }))

  const handleTabPress = useCallback(
    (key: RatingView) => {
      if (disabled) return
      if (Platform.OS !== 'web') void Haptics.selectionAsync()
      onChangeView(key)
    },
    [disabled, onChangeView],
  )

  return (
    <View style={[styles.container, style]}>
      {/* Sliding indicator */}
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, indicatorStyle]}
      />

      {VIEWS.map((view) => (
        <Pressable
          key={view.key}
          onPress={() => handleTabPress(view.key)}
          disabled={disabled}
          onLayout={(e: LayoutChangeEvent) => {
            tabWidths.current[view.key] = e.nativeEvent.layout.width
            tabOffsets.current[view.key] = e.nativeEvent.layout.x
            // Trigger update if this is the active tab
            if (view.key === activeView) {
              updateIndicator(view.key)
            }
          }}
          style={styles.tab}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeView === view.key }}
        >
          <Text
            style={[
              styles.tabLabel,
              activeView === view.key && styles.activeTabLabel,
            ]}
          >
            {view.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.full,
    borderWidth: borderWidth.thin,
    borderColor: colors.glassBorder,
    padding: 3,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: colors.accentTeal,
    borderRadius: borderRadius.full,
    zIndex: 0,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    zIndex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  activeTabLabel: {
    color: colors.bgL0,
  },
})

export const RatingToggle = memo(RatingToggleInner)
