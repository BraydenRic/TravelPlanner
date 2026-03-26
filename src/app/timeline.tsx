/**
 * Timeline — Chronological travel timeline with pull-to-refresh.
 */

import React, { useCallback } from 'react'
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'

import * as Haptics from 'expo-haptics'
import { usePlacesStore } from '@stores/placesStore'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'

import { GlassPanel } from '@components/ui/GlassPanel'
import { CategoryBadge } from '@components/ui/CategoryBadge'
import { getCountryByCode } from '@constants/countries'

export default function TimelineScreen() {
  const { places } = usePlacesStore()
  const [refreshing, setRefreshing] = React.useState(false)

  const sorted = React.useMemo(
    () =>
      [...places]
        .filter((p) => p.visited_date || p.planned_date)
        .sort((a, b) => {
          const da = new Date(a.visited_date ?? a.planned_date ?? '').getTime()
          const db = new Date(b.visited_date ?? b.planned_date ?? '').getTime()
          return db - da
        }),
    [places],
  )

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1200)
  }, [])

  const renderTimelineItem = useCallback(
    ({ item: place, index }: { item: typeof sorted[number]; index: number }) => {
      const country = getCountryByCode(place.country_code)
      const date = place.visited_date ?? place.planned_date
      return (
        <View key={place.id} style={styles.entry}>
          {/* Connector line */}
          {index < sorted.length - 1 && (
            <View style={styles.connector}>
              {Array.from({ length: 4 }, (_, i) => (
                <View key={i} style={styles.connectorDot} />
              ))}
            </View>
          )}

          {/* Entry dot */}
          <View
            style={[
              styles.entryDot,
              {
                backgroundColor:
                  place.category === 'been'
                    ? colors.accentTeal
                    : place.category === 'lived'
                    ? colors.accentAmber
                    : colors.accentViolet,
              },
            ]}
          />

          {/* Entry card */}
          <GlassPanel style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryFlag}>{country?.flag ?? '🌍'}</Text>
              <View style={styles.entryInfo}>
                <Text style={styles.entryCountry}>
                  {country?.name ?? place.country_code}
                </Text>
                {date && (
                  <Text style={styles.entryDate}>{formatDate(date)}</Text>
                )}
              </View>
              <CategoryBadge category={place.category} />
            </View>

            {place.overall_score !== null && place.overall_score !== undefined && (
              <Text style={styles.entryScore}>
                {place.overall_score.toFixed(1)} ★
              </Text>
            )}
          </GlassPanel>
        </View>
      )
    },
    [sorted],
  )

  const ListHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>Timeline</Text>
      <Text style={styles.subtitle}>
        {sorted.length} travel record{sorted.length !== 1 ? 's' : ''}
      </Text>
    </View>
  )

  const ListEmpty = (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No travel records yet.</Text>
      <Text style={styles.emptySubtext}>
        Add places to your map to see them here.
      </Text>
    </View>
  )

  const ListFooter = <View style={{ height: spacing.xxl + spacing.xxxl }} />

  return (
    <View style={styles.container}>
      <FlashList
        data={sorted}
        renderItem={renderTimelineItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={120}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
      />
    </View>
  )
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch { return d }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  content: {
    paddingTop: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  timeline: {
    gap: 0,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
    paddingLeft: spacing.sm,
  },
  connector: {
    position: 'absolute',
    left: spacing.sm + 5,
    top: 28,
    bottom: -spacing.md,
    width: 1,
    alignItems: 'center',
    gap: 5,
    zIndex: 0,
  },
  connectorDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.bgL3,
  },
  entryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 14,
    flexShrink: 0,
    zIndex: 1,
  },
  entryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryFlag: {
    fontSize: 22,
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  entryCountry: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  entryDate: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  entryScore: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.accentAmber,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  compassIcon: {
    fontSize: 28,
  },
})
