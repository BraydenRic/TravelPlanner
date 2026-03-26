/**
 * ShimmerSkeleton — animated gradient sweep loading skeleton.
 * NOT a static gray box — has a left-to-right shimmer sweep.
 */

import React, { memo, useEffect } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '@theme/colors'
import { duration } from '@theme/animations'

interface ShimmerSkeletonProps {
  width: number | `${number}%`
  height: number
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

function ShimmerSkeletonInner({
  width,
  height,
  borderRadius = 8,
  style,
}: ShimmerSkeletonProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: duration.verySlow * 2 }),
      -1,
      false,
    )
    return () => {
      progress.value = 0
    }
  }, [progress])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-(typeof width === 'number' ? width : 300), typeof width === 'number' ? width : 300],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }))

  const numericWidth = typeof width === 'number' ? width : 300

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.bgL2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0.12)',
            'rgba(255,255,255,0.06)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: numericWidth * 2, height }}
        />
      </Animated.View>
    </View>
  )
}

export const ShimmerSkeleton = memo(ShimmerSkeletonInner)
