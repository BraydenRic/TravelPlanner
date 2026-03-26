/**
 * City detail page — ratings, review, photos, edit button.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { usePlacesStore } from '@stores/placesStore'
import { getCityById } from '@services/places'
import type { City } from '@typedefs/database'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { getCountryByCode } from '@constants/countries'
import { GlassPanel } from '@components/ui/GlassPanel'
import { GlobalRatingBadge } from '@components/ratings/GlobalRatingBadge'
import { RatingRadarChart } from '@components/ratings/RatingRadarChart'
import { RatingBarChart } from '@components/ratings/RatingBarChart'
import { CategoryBadge } from '@components/ui/CategoryBadge'
import { SpringButton } from '@components/ui/SpringButton'
import { sanitizeReview } from '@lib/sanitize'
import type { RatingCategory } from '@typedefs/database'

const EMPTY_RATINGS: Record<RatingCategory, number> = {
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
}

export default function CityDetailScreen() {
  const { code, cityId } = useLocalSearchParams<{ code: string; cityId: string }>()
  const country = getCountryByCode(code)
  const { places } = usePlacesStore()
  const [city, setCity] = useState<City | null>(null)

  useEffect(() => {
    if (cityId) void getCityById(cityId).then(setCity)
  }, [cityId])

  const place = useMemo(
    () => places.find((p) => p.country_code === code && p.city_id === cityId),
    [places, code, cityId],
  )

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }, [])

  const handleEditRating = useCallback(() => {
    router.push(`/country/${code}/city/${cityId}/rate`)
  }, [code, cityId])

  const reviewText = place?.review ? sanitizeReview(place.review) : null

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <GlassPanel style={styles.backBtn}>
        <Pressable onPress={handleBack} style={styles.backPressable}>
          <Text style={styles.backText}>← {country?.name}</Text>
        </Pressable>
      </GlassPanel>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.cityName}>{city?.name ?? '...'}</Text>
          <Text style={styles.countryInfo}>
            {country?.flag} {country?.name}
          </Text>
          {place?.category && (
            <CategoryBadge category={place.category} style={{ marginTop: spacing.xs }} />
          )}
        </View>
        <GlobalRatingBadge
          score={place?.overall_score ?? 0}
          size="large"
        />
      </View>

      {/* Radar */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Category Scores</Text>
        <View style={styles.radarCenter}>
          <RatingRadarChart ratings={EMPTY_RATINGS} size={220} />
        </View>
      </View>

      {/* Bar */}
      <View style={styles.section}>
        <RatingBarChart ratings={{}} />
      </View>

      {/* Review */}
      {reviewText && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review</Text>
          <GlassPanel style={styles.reviewCard}>
            <Text style={styles.reviewText}>&quot;{reviewText}&quot;</Text>
          </GlassPanel>
        </View>
      )}

      {/* Edit button */}
      <View style={styles.editRow}>
        <SpringButton variant="secondary" onPress={handleEditRating}>
          Edit Rating
        </SpringButton>
      </View>

      <View style={{ height: spacing.xxl + spacing.xxxl }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  content: {
    paddingTop: spacing.xxl + spacing.md,
    gap: spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  backPressable: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  cityName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  countryInfo: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chartSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  radarCenter: {
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: spacing.sm,
  },
  reviewCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  reviewText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  editRow: {
    paddingHorizontal: spacing.lg,
  },
})
