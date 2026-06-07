/**
 * TopRatedList — Leaderboard of top-rated countries.
 * Large rank numbers, score bars, staggered entrance animation.
 */

import React, { memo, useCallback } from 'react'
import { type DimensionValue, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs, stagger } from '@theme/animations'
import type { CountryRatings } from '@typedefs/api'
import type { RatingCategory } from '@typedefs/database'
import { getCountryByCode } from '@constants/countries'

interface TopRatedListProps {
  ratings: CountryRatings[]
  onCountryPress: (code: string) => void
  activeCategory?: RatingCategory
}

interface RatedItem {
  rank: number
  countryCode: string
  score: number
}

function TopRatedRow({
  item,
  index,
  onPress,
}: {
  item: RatedItem
  index: number
  onPress: (code: string) => void
}) {
  const country = getCountryByCode(item.countryCode)
  const opacity = useSharedValue(0)
  const translateX = useSharedValue(-20)

  React.useEffect(() => {
    const delay = index * stagger.normal
    opacity.value = withDelay(delay, withSpring(1, springs.standard))
    translateX.value = withDelay(delay, withSpring(0, springs.standard))
    return () => {
      opacity.value = 0
      translateX.value = -20
    }
  }, [opacity, translateX, index])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }))

  const pressScale = useSharedValue(1)
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }))

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress(item.countryCode)
  }, [onPress, item.countryCode])

  const barWidth = `${(item.score / 5) * 100}%`

  return (
    <Animated.View style={[animStyle, pressStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => { pressScale.value = withSpring(0.98, springs.snappy) }}
        onPressOut={() => { pressScale.value = withSpring(1, springs.standard) }}
        style={styles.row}
        accessibilityRole="button"
      >
        {/* Rank number */}
        <Text style={[styles.rank, item.rank <= 3 && styles.rankTop]}>
          {item.rank}
        </Text>

        {/* Flag + country */}
        <View style={styles.countryBlock}>
          <Text style={styles.flag}>{country?.flag ?? '🌍'}</Text>
          <Text style={styles.countryName} numberOfLines={1}>
            {country?.name ?? item.countryCode}
          </Text>
        </View>

        {/* Score bar */}
        <View style={styles.barContainer}>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={[colors.accentAmber, 'rgba(245,166,35,0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: barWidth as DimensionValue }]}
            />
          </View>
          <Text style={styles.score}>{item.score.toFixed(1)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}

function TopRatedListInner({
  ratings,
  onCountryPress,
  activeCategory,
}: TopRatedListProps) {
  const items: RatedItem[] = ratings
    .slice()
    .sort((a, b) => b.overall_score - a.overall_score)
    .map((r, i) => ({
      rank: i + 1,
      countryCode: r.country_code,
      score: activeCategory
        ? (r.categories[activeCategory] ?? 0)
        : r.overall_score,
    }))

  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <TopRatedRow
          key={item.countryCode}
          item={item}
          index={i}
          onPress={onCountryPress}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    backgroundColor: colors.bgL1,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  rank: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textTertiary,
    width: 40,
    textAlign: 'center',
    letterSpacing: -1,
  },
  rankTop: {
    color: colors.accentAmber,
  },
  countryBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 140,
  },
  flag: {
    fontSize: 20,
  },
  countryName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.whiteAlpha06,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  score: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.accentAmber,
    width: 28,
    textAlign: 'right',
  },
})

export const TopRatedList = memo(TopRatedListInner)
