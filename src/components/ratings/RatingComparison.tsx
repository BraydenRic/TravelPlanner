/**
 * RatingComparison — Side-by-side or overlay comparison of member ratings.
 * Overlay: multiple radar polygons. Side-by-side: stacked bar charts.
 */

import React, { memo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors } from '@theme/colors'
import { fontFamily, fontSize } from '@theme/typography'
import { spacing } from '@theme/spacing'
import type { RatingCategory, MemberColor } from '@typedefs/database'
import { RatingRadarChart } from './RatingRadarChart'
import { RatingBarChart } from './RatingBarChart'

interface MemberRatingEntry {
  userId: string
  color: MemberColor
  ratings: Partial<Record<RatingCategory, number>>
}

interface RatingComparisonProps {
  memberRatings: MemberRatingEntry[]
  mode: 'overlay' | 'sideBySide'
  size?: number
}

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

function toFullRatings(partial: Partial<Record<RatingCategory, number>>): Record<RatingCategory, number> {
  return { ...EMPTY_RATINGS, ...partial }
}

function OverlayMode({ memberRatings, size }: { memberRatings: MemberRatingEntry[]; size: number }) {
  if (memberRatings.length === 0) return null

  const primary = memberRatings[0]
  const groupOverlays = memberRatings.slice(1).map((m) => ({
    color: m.color,
    ratings: toFullRatings(m.ratings),
  }))

  return (
    <View style={styles.overlayContainer}>
      <RatingRadarChart
        ratings={toFullRatings(primary.ratings)}
        groupRatings={groupOverlays}
        size={size}
      />
      {/* Legend */}
      <View style={styles.legend}>
        {memberRatings.map((m) => (
          <View key={m.userId} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: m.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {m.userId}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function SideBySideMode({ memberRatings }: { memberRatings: MemberRatingEntry[] }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {memberRatings.map((m) => (
        <View key={m.userId} style={styles.memberBlock}>
          <View style={styles.memberHeader}>
            <View style={[styles.memberDot, { backgroundColor: m.color }]} />
            <Text style={styles.memberLabel} numberOfLines={1}>
              {m.userId}
            </Text>
          </View>
          <RatingBarChart ratings={m.ratings} animate />
        </View>
      ))}
    </ScrollView>
  )
}

function RatingComparisonInner({
  memberRatings,
  mode,
  size = 240,
}: RatingComparisonProps) {
  if (memberRatings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No member ratings to compare.</Text>
      </View>
    )
  }

  if (mode === 'overlay') {
    return <OverlayMode memberRatings={memberRatings} size={size} />
  }

  return <SideBySideMode memberRatings={memberRatings} />
}

const styles = StyleSheet.create({
  overlayContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    maxWidth: 80,
  },
  memberBlock: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  memberDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textTertiary,
  },
})

export const RatingComparison = memo(RatingComparisonInner)
