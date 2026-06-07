/**
 * CityPin — Individual city pin for the drill-down map.
 * 44x44 tap target, visited/unvisited states, group indicators, score badge.
 */

import React, { memo, useCallback, useEffect } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated'

import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { fontFamily } from '@theme/typography'
import { springs, duration } from '@theme/animations'
import type { City, PlaceCategory, MemberColor } from '@typedefs/database'

interface CityPinProps {
  city: City
  isVisited: boolean
  category?: PlaceCategory
  overallScore?: number
  groupIndicators?: MemberColor[]
  onPress: () => void
  isAnimated?: boolean
}

const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  been: colors.accentTeal,
  want_to_go: colors.accentViolet,
  lived: colors.accentAmber,
}

const PIN_SIZE = 16

function CityPinInner({
  city,
  isVisited,
  category = 'been',
  overallScore,
  groupIndicators,
  onPress,
  isAnimated = true,
}: CityPinProps) {
  const scale = useSharedValue(isAnimated ? 0 : 1)
  const pulseAnim = useSharedValue(0)

  useEffect(() => {
    if (isAnimated) {
      scale.value = withSpring(1, springs.bouncy)
    }

    if (!isVisited) {
      // Gentle pulse for unvisited pins
      pulseAnim.value = withRepeat(
        withTiming(1, { duration: duration.verySlow + 400 }),
        -1,
        true,
      )
    }

    return () => {
      scale.value = 1
      pulseAnim.value = 0
    }
  }, [isAnimated, isVisited, scale, pulseAnim])

  const pressScale = useSharedValue(1)

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.9, springs.snappy)
  }, [pressScale])

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, springs.standard)
  }, [pressScale])

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }, [onPress])

  const pinAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pressScale.value }],
  }))

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.3, 0]),
    transform: [
      { scale: interpolate(pulseAnim.value, [0, 1], [1, 1.8]) },
    ],
  }))

  const pinColor = isVisited ? CATEGORY_COLORS[category] : 'transparent'

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        style={styles.tapTarget}
        accessibilityLabel={`${city.name} city pin`}
        accessibilityRole="button"
      >
        <Animated.View style={pinAnimStyle}>
          <View style={styles.pinContainer}>
            {/* Pulse ring for unvisited */}
            {!isVisited && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseRing,
                  { borderColor: colors.textTertiary },
                  pulseStyle,
                ]}
              />
            )}

            {/* Pin circle */}
            <View
              style={[
                styles.pin,
                isVisited
                  ? { backgroundColor: pinColor }
                  : styles.pinUnvisited,
              ]}
            >
              {overallScore !== undefined && isVisited && (
                <Text style={styles.scoreOverlay}>
                  {overallScore.toFixed(0)}
                </Text>
              )}
            </View>

            {/* Group indicators */}
            {groupIndicators && groupIndicators.length > 0 && (
              <View style={styles.indicators}>
                {groupIndicators.slice(0, 4).map((color, i) => (
                  <View
                    key={i}
                    style={[styles.indicator, { backgroundColor: color }]}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>

      {/* City name label */}
      <Text style={styles.cityLabel} numberOfLines={1}>
        {city.name}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  tapTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: PIN_SIZE + 8,
    height: PIN_SIZE + 8,
    borderRadius: (PIN_SIZE + 8) / 2,
    borderWidth: 1,
  },
  pin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinUnvisited: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: colors.textTertiary,
  },
  scoreOverlay: {
    fontFamily: fontFamily.mono,
    fontSize: 8,
    color: colors.bgL0,
    fontWeight: '700',
  },
  indicators: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    gap: 1,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 0.5,
    borderColor: colors.bgL1,
  },
  cityLabel: {
    fontFamily: fontFamily.body,
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
    maxWidth: 60,
    textAlign: 'center',
  },
})

export const CityPin = memo(CityPinInner)
