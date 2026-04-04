/**
 * Country detail page — hero, ratings, city list, timeline.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { usePlacesStore } from '@stores/placesStore'
import { useGroupStore } from '@stores/groupStore'
import { getCitiesByCountry } from '@services/places'
import { getCountryRatings } from '@services/ratings'
import { useAuthStore } from '@stores/authStore'
import type { CountryRatings } from '@typedefs/api'
import type { City } from '@typedefs/database'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { getCountryByCode } from '@constants/countries'
import { GlassPanel } from '@components/ui/GlassPanel'
import { GlobalRatingBadge } from '@components/ratings/GlobalRatingBadge'
import { RatingRadarChart } from '@components/ratings/RatingRadarChart'
import { RatingBarChart } from '@components/ratings/RatingBarChart'
import { RatingToggle } from '@components/ratings/RatingToggle'
import { CategoryBadge } from '@components/ui/CategoryBadge'
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

export default function CountryDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const country = getCountryByCode(code)
  const { places } = usePlacesStore()
  const { activeGroupId } = useGroupStore()
  const { user } = useAuthStore()
  const [ratingView, setRatingView] = React.useState<'personal' | 'group' | 'compare'>('personal')
  const [countryRatings, setCountryRatings] = useState<CountryRatings | null>(null)

  const [cities, setCities] = useState<City[]>([])
  useEffect(() => {
    if (code) void getCitiesByCountry(code).then(setCities).catch(() => {})
  }, [code])

  useEffect(() => {
    if (code && user) {
      void getCountryRatings(code, user.id).then(setCountryRatings).catch(() => {})
    }
  }, [code, user])
  const cityNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of cities) m[c.id] = c.name
    return m
  }, [cities])

  const countryPlaces = useMemo(
    () => places.filter((p) => p.country_code === code),
    [places, code],
  )

  const visitedCities = useMemo(
    () => countryPlaces.filter((p) => p.city_id && p.category === 'been'),
    [countryPlaces],
  )

  // Group places by city so each city appears once with multiple category badges
  const citiesGrouped = useMemo(() => {
    const map = new Map<string, { cityId: string; categories: string[]; visitedDate?: string; overallScore?: number }>()
    for (const p of countryPlaces) {
      if (!p.city_id) continue
      const existing = map.get(p.city_id)
      if (existing) {
        existing.categories.push(p.category)
        if (!existing.overallScore && p.overall_score) existing.overallScore = p.overall_score
      } else {
        map.set(p.city_id, {
          cityId: p.city_id,
          categories: [p.category],
          visitedDate: p.visited_date ?? undefined,
          overallScore: p.overall_score ?? undefined,
        })
      }
    }
    return Array.from(map.values())
  }, [countryPlaces])

  const overallScore = useMemo(() => {
    const scored = countryPlaces.filter((p) => p.overall_score)
    if (scored.length === 0) return null
    return scored.reduce((sum, p) => sum + (p.overall_score ?? 0), 0) / scored.length
  }, [countryPlaces])

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/map')
    }
  }, [])

  const handleCityPress = useCallback(
    (cityId: string) => {
      router.push(`/country/${code}/city/${cityId}`)
    },
    [code],
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <GlassPanel style={styles.backBtn}>
        <Pressable onPress={handleBack} style={styles.backPressable}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </GlassPanel>

      {/* Hero section */}
      <View style={styles.hero}>
        <Image
          source={{ uri: `https://flagcdn.com/w80/${code.toLowerCase()}.png` }}
          style={styles.heroFlag}
          resizeMode="cover"
        />
        <View style={styles.heroText}>
          <Text style={styles.countryName}>{country?.name ?? code}</Text>
          <Text style={styles.heroSub}>
            Based on {visitedCities.length} of {country?.totalCities ?? '?'} cities rated
          </Text>
        </View>
        <GlobalRatingBadge score={countryRatings?.overall_score ?? overallScore ?? 0} size="large" />
      </View>

      {/* Rating toggle (only if in group) */}
      {activeGroupId && (
        <View style={styles.toggleRow}>
          <RatingToggle activeView={ratingView} onChangeView={setRatingView} />
        </View>
      )}

      {/* Radar chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.radarCenter}>
          <RatingRadarChart ratings={countryRatings?.categories ?? EMPTY_RATINGS} size={240} />
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.barSection}>
        <RatingBarChart ratings={countryRatings?.categories ?? {}} />
      </View>

      {/* City list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cities</Text>
        {citiesGrouped.map((entry) => (
          <Pressable
            key={entry.cityId}
            onPress={() => handleCityPress(entry.cityId)}
            style={styles.cityRow}
            accessibilityRole="button"
          >
            <View style={styles.cityInfo}>
              <Text style={styles.cityName}>{cityNameMap[entry.cityId] ?? entry.cityId}</Text>
              {entry.visitedDate && (
                <Text style={styles.cityDate}>{formatDate(entry.visitedDate)}</Text>
              )}
            </View>
            <View style={styles.cityRight}>
              {entry.categories.map((cat) => (
                <CategoryBadge key={cat} category={cat as any} />
              ))}
              {entry.overallScore != null && (
                <Text style={styles.cityScore}>{entry.overallScore.toFixed(1)}</Text>
              )}
            </View>
          </Pressable>
        ))}
        {citiesGrouped.length === 0 && (
          <Text style={styles.emptyText}>No cities visited yet</Text>
        )}
      </View>

      <View style={{ height: spacing.xxl + spacing.xxxl }} />
    </ScrollView>
  )
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return d
  }
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heroFlag: {
    width: 56,
    height: 40,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  countryName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  toggleRow: {
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-start',
  },
  chartSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  radarCenter: {
    alignItems: 'center',
  },
  barSection: {
    paddingHorizontal: spacing.lg,
  },
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
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.sm,
    minHeight: 52,
  },
  cityInfo: {
    flex: 1,
    gap: 2,
  },
  cityName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  cityDate: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  cityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cityScore: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.base,
    color: colors.accentAmber,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
})
