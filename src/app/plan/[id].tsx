/**
 * Plan detail — countdown, date range, budget, notes.
 */

import React, { useCallback, useMemo } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { usePlacesStore } from '@stores/placesStore'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import { GlassPanel } from '@components/ui/GlassPanel'
import { getCountryByCode } from '@constants/countries'

function FlipCountdown({ daysLeft }: { daysLeft: number }) {
  const flipAnim = useSharedValue(0)

  React.useEffect(() => {
    flipAnim.value = withSpring(1, springs.bouncy)
    return () => {
      flipAnim.value = 0
    }
  }, [daysLeft, flipAnim])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: flipAnim.value }],
  }))

  return (
    <Animated.View style={[styles.countdown, animStyle]}>
      <Text style={styles.countdownNumber}>
        {daysLeft > 0 ? daysLeft : '0'}
      </Text>
      <Text style={styles.countdownLabel}>
        {daysLeft === 1 ? 'day' : 'days'} to go
      </Text>
    </Animated.View>
  )
}

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { places } = usePlacesStore()

  const plan = useMemo(
    () => places.find((p) => p.id === id),
    [places, id],
  )

  const country = plan ? getCountryByCode(plan.country_code) : null

  const daysLeft = useMemo(() => {
    if (!plan?.planned_date) return null
    const now = new Date()
    const target = new Date(plan.planned_date)
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }, [plan])

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/groups')
    }
  }, [])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <GlassPanel style={styles.backBtn}>
        <Pressable onPress={handleBack} style={styles.backPressable}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </GlassPanel>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.flag}>{country?.flag ?? '🌍'}</Text>
        <Text style={styles.countryName}>{country?.name ?? 'Destination'}</Text>
      </View>

      {/* Countdown */}
      {daysLeft !== null && (
        <GlassPanel style={styles.countdownCard}>
          <FlipCountdown daysLeft={daysLeft} />
        </GlassPanel>
      )}

      {/* Details */}
      <View style={styles.detailsGrid}>
        {plan?.planned_date && (
          <GlassPanel style={styles.detailCard}>
            <Text style={styles.detailLabel}>Departure</Text>
            <Text style={styles.detailValue}>{formatDate(plan.planned_date)}</Text>
          </GlassPanel>
        )}
        {plan?.planned_budget && (
          <GlassPanel style={styles.detailCard}>
            <Text style={styles.detailLabel}>Budget</Text>
            <Text style={styles.detailValue}>
              {plan.currency_code ?? 'USD'} {plan.planned_budget.toLocaleString()}
            </Text>
          </GlassPanel>
        )}
      </View>

      <View style={{ height: spacing.xxl + spacing.xxxl }} />
    </ScrollView>
  )
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch { return d }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  content: {
    paddingTop: spacing.xxl + spacing.md,
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
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
    alignItems: 'center',
    gap: spacing.sm,
  },
  flag: {
    fontSize: 72,
  },
  countryName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  countdownCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  countdown: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontFamily: fontFamily.mono,
    fontSize: 80,
    color: colors.accentTeal,
    letterSpacing: -3,
    lineHeight: 88,
  },
  countdownLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailCard: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  detailLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
})
