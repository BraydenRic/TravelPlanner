/**
 * RatingBarChart — Horizontal bar chart for all 10 rating categories.
 * Staggered entrance animation, amber gradient bars.
 */

import React, { memo, useEffect } from 'react'
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  withDelay,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '@theme/colors'
import { fontFamily, fontSize } from '@theme/typography'
import { spacing } from '@theme/spacing'
import { springs, stagger } from '@theme/animations'
import { RATING_CATEGORIES } from '@constants/ratingCategories'
import type { RatingCategory } from '@typedefs/database'

interface RatingBarChartProps {
  ratings: Partial<Record<RatingCategory, number>>
  animate?: boolean
  style?: StyleProp<ViewStyle>
}

interface BarRowProps {
  label: string
  score: number
  index: number
  animate: boolean
}

function BarRow({ label, score, index, animate }: BarRowProps) {
  const widthAnim = useSharedValue(0)
  const opacityAnim = useSharedValue(0)

  useEffect(() => {
    if (!animate) {
      widthAnim.value = score / 5
      opacityAnim.value = 1
      return
    }
    const delay = index * stagger.normal

    widthAnim.value = withDelay(
      delay,
      withSpring(score / 5, springs.standard),
    )
    opacityAnim.value = withDelay(
      delay,
      withSpring(1, springs.standard),
    )
  }, [score, index, animate, widthAnim, opacityAnim])

  const animatedBarStyle = useAnimatedStyle(() => ({
    flex: widthAnim.value,
  }))

  const animatedRowStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
  }))

  const formattedScore = score > 0 ? score.toFixed(1) : '—'

  return (
    <Animated.View style={[styles.row, animatedRowStyle]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, animatedBarStyle]}>
          <LinearGradient
            colors={[colors.accentAmber, 'rgba(245,166,35,0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {/* Empty remainder */}
        <View style={{ flex: 1 - (score / 5) }} />
      </View>
      <Text style={styles.score}>{formattedScore}</Text>
    </Animated.View>
  )
}

function RatingBarChartInner({
  ratings,
  animate = true,
  style,
}: RatingBarChartProps) {
  return (
    <View style={[styles.container, style]}>
      {RATING_CATEGORIES.map((cat, index) => (
        <BarRow
          key={cat.key}
          label={cat.label}
          score={ratings[cat.key as RatingCategory] ?? 0}
          index={index}
          animate={animate}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.smmd,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 24,
  },
  label: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    width: 120,
    flexShrink: 1,
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.whiteAlpha06,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  score: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    width: 24,
    textAlign: 'right',
  },
})

export const RatingBarChart = memo(RatingBarChartInner)
