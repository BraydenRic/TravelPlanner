/**
 * CountryRatingSummary — Compact country rating card (tooltips + lists).
 */

import React, { memo, useCallback } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import type { RatingCategory } from '@typedefs/database'
import { getCountryByCode } from '@constants/countries'
import { GlassPanel } from '@components/ui/GlassPanel'
import { RatingRadarChart } from '@components/ratings/RatingRadarChart'

interface CountryRatingSummaryProps {
  countryCode: string
  countryName: string
  globalScore: number
  cityCount: number
  citiesRated: number
  groupScore?: number
  ratings?: Partial<Record<RatingCategory, number>>
  onPress?: () => void
}

function CountryRatingSummaryInner({
  countryCode,
  countryName,
  globalScore,
  cityCount,
  citiesRated,
  groupScore,
  ratings,
  onPress,
}: CountryRatingSummaryProps) {
  const country = getCountryByCode(countryCode)
  const flag = country?.flag ?? '🌍'

  const handlePress = useCallback(() => {
    if (onPress) {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onPress()
    }
  }, [onPress])

  // Build full ratings record for mini radar
  const fullRatings = ratings
    ? ({
        overall_experience: 0,
        safety: 0,
        food_cuisine: 0,
        transportation: 0,
        friendliness: 0,
        affordability: 0,
        cleanliness: 0,
        nightlife_entertainment: 0,
        natural_beauty: 0,
        wifi_connectivity: 0,
        ...ratings,
      } as Record<RatingCategory, number>)
    : null

  const content = (
    <View style={styles.inner}>
      <View style={styles.left}>
        <Text style={styles.flag}>{flag}</Text>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{countryName}</Text>
          <Text style={styles.cities}>
            {citiesRated}/{cityCount} cities
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {fullRatings && (
          <RatingRadarChart ratings={fullRatings} size={48} />
        )}
        <View style={styles.scoreBlock}>
          <Text style={styles.score}>{globalScore.toFixed(1)}</Text>
          {groupScore !== undefined && (
            <Text style={styles.groupScore}>
              G: {groupScore.toFixed(1)}
            </Text>
          )}
        </View>
      </View>
    </View>
  )

  if (onPress) {
    return (
      <GlassPanel style={styles.card}>
        <Pressable onPress={handlePress} accessibilityRole="button">
          {content}
        </Pressable>
      </GlassPanel>
    )
  }

  return <GlassPanel style={styles.card}>{content}</GlassPanel>
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  flag: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  cities: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreBlock: {
    alignItems: 'flex-end',
  },
  score: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['2xl'],
    color: colors.accentAmber,
  },
  groupScore: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.accentViolet,
  },
})

export const CountryRatingSummary = memo(CountryRatingSummaryInner)
