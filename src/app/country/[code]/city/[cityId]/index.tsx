/**
 * City detail screen — clean hero layout with real ratings data.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { usePlacesStore } from '@stores/placesStore'
import { useAuthStore } from '@stores/authStore'
import { getCityById } from '@services/places'
import { getPlaceRatings } from '@services/ratings'
import type { City, PlaceRating, RatingCategory } from '@typedefs/database'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { getCountryByCode } from '@constants/countries'
import { GlassPanel } from '@components/ui/GlassPanel'
import { GlobalRatingBadge } from '@components/ratings/GlobalRatingBadge'
import { RatingBarChart } from '@components/ratings/RatingBarChart'
import { CategoryBadge } from '@components/ui/CategoryBadge'
import { SpringButton } from '@components/ui/SpringButton'
import { sanitizeReview } from '@lib/sanitize'

export default function CityDetailScreen() {
  const { code, cityId } = useLocalSearchParams<{ code: string; cityId: string }>()
  const country = getCountryByCode(code)
  const { places } = usePlacesStore()
  const { user } = useAuthStore()
  const [city, setCity] = useState<City | null>(null)
  const [placeRatings, setPlaceRatings] = useState<PlaceRating[]>([])

  useEffect(() => {
    if (cityId) void getCityById(cityId).then(setCity)
  }, [cityId])

  const place = useMemo(
    () => places.find((p) => p.country_code === code && p.city_id === cityId),
    [places, code, cityId],
  )

  // Re-fetch ratings every time this screen gains focus (including returning from rate screen)
  useFocusEffect(
    useCallback(() => {
      if (!place || !user) {
        setPlaceRatings([])
        return
      }
      void getPlaceRatings(place.id)
        .then(setPlaceRatings)
        .catch(() => setPlaceRatings([]))
    }, [place, user]),
  )

  const ratingsMap = useMemo(() => {
    const map: Partial<Record<RatingCategory, number>> = {}
    for (const r of placeRatings) {
      map[r.category] = r.score
    }
    return map
  }, [placeRatings])

  const hasRatings = placeRatings.length > 0

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/map')
    }
  }, [])

  const handleEditRating = useCallback(() => {
    router.push({
      pathname: '/country/[code]/city/[cityId]/rate',
      params: { code, cityId, placeId: place?.id ?? '', category: place?.category ?? 'been' },
    })
  }, [code, cityId, place])

  const reviewText = place?.review ? sanitizeReview(place.review) : null

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <GlassPanel style={styles.backBtn}>
          <Pressable onPress={handleBack} style={styles.backPressable}>
            <Text style={styles.backText}>← {country?.name}</Text>
          </Pressable>
        </GlassPanel>

        <Text style={styles.heroFlag}>{country?.flag}</Text>

        <View style={styles.heroCenter}>
          <Text style={styles.cityName} numberOfLines={2}>{city?.name ?? '...'}</Text>
          <Text style={styles.countryName}>{country?.name}</Text>
          {city?.is_capital && <Text style={styles.capitalTag}>Capital City</Text>}
        </View>

        <View style={styles.heroBottom}>
          {place?.category && (
            <CategoryBadge category={place.category} />
          )}
          {!place && (
            <View style={styles.unvisitedBadge}>
              <Text style={styles.unvisitedText}>Not visited yet</Text>
            </View>
          )}
          <GlobalRatingBadge score={place?.overall_score ?? 0} size="large" />
        </View>
      </View>

      {/* Ratings section */}
      {hasRatings ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Ratings</Text>
          <GlassPanel style={styles.ratingsCard}>
            <RatingBarChart ratings={ratingsMap} animate />
          </GlassPanel>
        </View>
      ) : place ? (
        <GlassPanel style={styles.emptyRatings}>
          <Text style={styles.emptyIcon}>★</Text>
          <Text style={styles.emptyTitle}>No ratings yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap &quot;Rate This City&quot; to add scores and a review.
          </Text>
        </GlassPanel>
      ) : null}

      {/* Review */}
      {reviewText && (
        <View style={styles.section}>
          <View style={styles.reviewLabelRow}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.privateBadge}>🔒 Private</Text>
          </View>
          <GlassPanel style={styles.reviewCard}>
            <Text style={styles.reviewText}>&quot;{reviewText}&quot;</Text>
          </GlassPanel>
        </View>
      )}

      {/* Action button */}
      <View style={styles.actionRow}>
        <SpringButton variant="secondary" onPress={handleEditRating}>
          {place ? 'Edit Rating' : 'Rate This City'}
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
    gap: spacing.lg,
  },
  // ── Hero ─────────────────────────────────────────────────────────
  hero: {
    paddingTop: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgL1,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  backPressable: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  heroFlag: {
    fontSize: 64,
    textAlign: 'center',
  },
  heroCenter: {
    alignItems: 'center',
    gap: 4,
  },
  cityName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['4xl'] ?? 36,
    color: colors.textPrimary,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  countryName: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  capitalTag: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.accentAmber,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  unvisitedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.whiteAlpha06,
    borderWidth: 1,
    borderColor: colors.whiteAlpha12,
  },
  unvisitedText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  // ── Sections ─────────────────────────────────────────────────────
  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  ratingsCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  // ── Empty state ───────────────────────────────────────────────────
  emptyRatings: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Review ───────────────────────────────────────────────────────
  reviewLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privateBadge: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
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
  // ── Action ───────────────────────────────────────────────────────
  actionRow: {
    paddingHorizontal: spacing.lg,
  },
})
