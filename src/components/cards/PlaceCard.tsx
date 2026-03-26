/**
 * PlaceCard — Card for a visited/wanted/lived place.
 * Staggered entrance animation, flag + category badge + score.
 */

import React, { memo, useCallback, useEffect } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs, stagger } from '@theme/animations'
import type { VisitedPlace } from '@typedefs/database'
import { getCountryByCode } from '@constants/countries'
import { CategoryBadge } from '@components/ui/CategoryBadge'
import { sanitizeReview } from '@lib/sanitize'

interface PlaceCardProps {
  place: VisitedPlace
  onPress: () => void
  onLongPress?: () => void
  index?: number
}

function PlaceCardInner({
  place,
  onPress,
  onLongPress,
  index = 0,
}: PlaceCardProps) {
  const country = getCountryByCode(place.country_code)

  const opacity = useSharedValue(0)
  const translateY = useSharedValue(16)

  useEffect(() => {
    const delay = index * stagger.normal
    opacity.value = withDelay(delay, withSpring(1, springs.standard))
    translateY.value = withDelay(delay, withSpring(0, springs.standard))
    return () => {
      opacity.value = 0
      translateY.value = 16
    }
  }, [opacity, translateY, index])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const pressScale = useSharedValue(1)
  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.97, springs.snappy)
  }, [pressScale])
  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, springs.standard)
  }, [pressScale])

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }))

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }, [onPress])

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onLongPress()
    }
  }, [onLongPress])

  const reviewSnippet = place.review ? sanitizeReview(place.review) : null
  const displayDate = place.visited_date ?? place.planned_date

  return (
    <Animated.View style={[animatedStyle, pressStyle]}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${country?.name ?? place.country_code} place card`}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <Text style={styles.flag}>{country?.flag ?? '🌍'}</Text>
          <View style={styles.topMid}>
            <Text style={styles.countryName}>
              {country?.name ?? place.country_code}
            </Text>
            {displayDate && (
              <Text style={styles.date}>
                {formatDate(displayDate)}
              </Text>
            )}
          </View>
          <View style={styles.topRight}>
            <CategoryBadge category={place.category} />
            {place.overall_score !== null && place.overall_score !== undefined && (
              <Text style={styles.score}>
                {place.overall_score.toFixed(1)}
              </Text>
            )}
          </View>
        </View>

        {/* Review snippet */}
        {reviewSnippet && (
          <Text style={styles.review} numberOfLines={2}>
            &quot;{reviewSnippet}&quot;
          </Text>
        )}
      </Pressable>
    </Animated.View>
  )
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flag: {
    fontSize: 28,
  },
  topMid: {
    flex: 1,
    gap: 2,
  },
  countryName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  date: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  score: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.md,
    color: colors.accentAmber,
  },
  review: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
})

export const PlaceCard = memo(PlaceCardInner)
