/**
 * Profile screen — Bento grid stats, continents, achievements, top rated.
 */

import React, { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import { useAuthStore } from '@stores/authStore'
import { usePlacesStore } from '@stores/placesStore'
import { useGroupStore } from '@stores/groupStore'
import { colors } from '@theme/colors'
import { spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { AnimatedNumber } from '@components/ui/AnimatedNumber'
import { GlassPanel } from '@components/ui/GlassPanel'
import { AchievementBadge } from '@components/cards/AchievementBadge'
import { COUNTRIES, CONTINENTS } from '@constants/countries'
import type { BadgeType } from '@typedefs/database'

const ALL_BADGE_TYPES: BadgeType[] = [
  'first_stamp', 'continental', 'globe_trotter', 'critic',
  'squad_goals', 'home_away', 'city_explorer',
]

// Continent ring component
function ContinentRing({
  continent,
  visited,
  total,
  color,
}: {
  continent: string
  visited: number
  total: number
  color: string
}) {
  const size = 48
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const progress = total > 0 ? (visited / total) * circ : 0

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={visited > 0 ? color : colors.bgL3}
          strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={circ - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.continentRingLabel, visited > 0 && { color: colors.textSecondary }]} numberOfLines={2}>
        {continent === 'North America' ? 'N. America' : continent === 'South America' ? 'S. America' : continent}
      </Text>
    </View>
  )
}

export default function ProfileScreen() {
  const { profile } = useAuthStore()
  const { places } = usePlacesStore()
  const { groups } = useGroupStore()

  const stats = useMemo(() => {
    const visited = new Set<string>()
    const cities = new Set<string>()
    const continentsVisited = new Set<string>()
    let totalScore = 0
    let scoredCount = 0

    places.forEach((p) => {
      if (p.category === 'been') {
        visited.add(p.country_code)
        const country = COUNTRIES.find((c) => c.code === p.country_code)
        if (country) continentsVisited.add(country.continent)
        if (p.city_id) cities.add(p.city_id)
        if (p.overall_score) {
          totalScore += p.overall_score
          scoredCount++
        }
      }
    })

    return {
      countries: visited.size,
      cities: cities.size,
      continents: [...continentsVisited],
      worldPct: Math.round((visited.size / COUNTRIES.length) * 1000) / 10,
      avgRating: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0,
    }
  }, [places])

  const continentData = useMemo(() =>
    CONTINENTS.map((cont) => ({
      continent: cont,
      total: COUNTRIES.filter((c) => c.continent === cont).length,
      visited: new Set(
        places
          .filter((p) => {
            const c = COUNTRIES.find((cc) => cc.code === p.country_code)
            return c?.continent === cont && p.category === 'been'
          })
          .map((p) => p.country_code),
      ).size,
    })),
  [places])

  const continentColors = [
    colors.accentTeal, colors.accentAmber, colors.accentViolet,
    colors.accentCoral, colors.accentTeal, colors.accentAmber,
  ]

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>
            {profile?.display_name ?? 'Traveler'}
          </Text>
          <Text style={styles.memberSince}>
            {groups.length} group{groups.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/profile/edit')}
          style={styles.settingsBtn}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Text style={styles.settingsIcon}>✎</Text>
        </Pressable>
      </View>

      {/* Bento grid */}
      <View style={styles.bento}>
        {/* Large: countries */}
        <GlassPanel style={[styles.bentoCard, styles.bentoLarge]}>
          <Text style={styles.bentoLabel}>Countries</Text>
          <AnimatedNumber
            value={stats.countries}
            style={styles.bentoBigNumber}
          />
        </GlassPanel>

        {/* Medium: cities */}
        <GlassPanel style={[styles.bentoCard, styles.bentoMedium]}>
          <Text style={styles.bentoLabel}>Cities</Text>
          <AnimatedNumber value={stats.cities} style={styles.bentoMedNumber} />
        </GlassPanel>

        {/* Medium: world % */}
        <GlassPanel style={[styles.bentoCard, styles.bentoMedium]}>
          <Text style={styles.bentoLabel}>World %</Text>
          <AnimatedNumber
            value={stats.worldPct}
            decimals={1}
            suffix="%"
            style={styles.bentoMedNumber}
          />
        </GlassPanel>

        {/* Small: avg rating */}
        <GlassPanel style={[styles.bentoCard, styles.bentoSmall]}>
          <Text style={styles.bentoLabel}>Avg Rating</Text>
          <AnimatedNumber
            value={stats.avgRating}
            decimals={1}
            style={[styles.bentoMedNumber, { color: colors.accentAmber }]}
          />
        </GlassPanel>

        {/* Small: continents */}
        <GlassPanel style={[styles.bentoCard, styles.bentoSmall]}>
          <Text style={styles.bentoLabel}>Continents</Text>
          <AnimatedNumber
            value={stats.continents.length}
            style={[styles.bentoMedNumber, { color: colors.accentViolet }]}
          />
          <Text style={styles.bentoSubLabel}>/6</Text>
        </GlassPanel>
      </View>

      {/* Continent rings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Continents</Text>
        <View style={styles.continentRings}>
          {continentData.map((cd, i) => (
            <ContinentRing
              key={cd.continent}
              continent={cd.continent}
              visited={cd.visited}
              total={cd.total}
              color={continentColors[i % continentColors.length]}
            />
          ))}
        </View>
      </View>

      {/* Achievement badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeRow}
        >
          {ALL_BADGE_TYPES.map((bt) => (
            <AchievementBadge
              key={bt}
              badgeType={bt}
              unlocked={false}
            />
          ))}
        </ScrollView>
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
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bgL2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.xl,
    color: colors.accentTeal,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  memberSince: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  bentoCard: {
    padding: spacing.md,
  },
  bentoLarge: {
    width: '100%',
    minHeight: 96,
  },
  bentoMedium: {
    flex: 1,
    minHeight: 80,
  },
  bentoSmall: {
    flex: 1,
    minHeight: 72,
  },
  bentoLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  bentoBigNumber: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['4xl'],
    color: colors.accentTeal,
    letterSpacing: -1,
  },
  bentoMedNumber: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  bentoSubLabel: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  continentRings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  continentRingLabel: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 13,
  },
  badgeRow: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
})
