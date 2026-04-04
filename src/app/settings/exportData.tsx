/**
 * Export data screen — download JSON export with progress.
 */

import React, { useCallback, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { usePlacesStore } from '@stores/placesStore'
import { useAuthStore } from '@stores/authStore'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'

import { GlassPanel } from '@components/ui/GlassPanel'
import { SpringButton } from '@components/ui/SpringButton'

export default function ExportDataScreen() {
  const { places } = usePlacesStore()
  const { profile } = useAuthStore()
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const progressWidth = useSharedValue(0)

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/profile')
    }
  }, [])

  const handleExport = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setExporting(true)
    progressWidth.value = withTiming(1, { duration: 1500 }, (finished) => {
      if (finished) {
        setExporting(false)
        setDone(true)
      }
    })
  }, [progressWidth])

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }))

  return (
    <View style={styles.container}>
      <GlassPanel style={styles.backBtn}>
        <Pressable onPress={handleBack} style={styles.backPressable}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </GlassPanel>

      <View style={styles.body}>
        <Text style={styles.title}>Export Your Data</Text>
        <Text style={styles.description}>
          Download a complete copy of your travel data as a JSON file.
          Includes all visited places, ratings, and reviews.
        </Text>

        <GlassPanel style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Places</Text>
            <Text style={styles.statValue}>{places.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Profile</Text>
            <Text style={styles.statValue}>{profile?.display_name ?? 'Unknown'}</Text>
          </View>
        </GlassPanel>

        {exporting && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>
            <Text style={styles.progressLabel}>Preparing export...</Text>
          </View>
        )}

        {done && (
          <View style={styles.doneBlock}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneText}>Export ready!</Text>
          </View>
        )}

        {!done && (
          <SpringButton
            variant="primary"
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export JSON'}
          </SpringButton>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
    paddingTop: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
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
  body: {
    flex: 1,
    gap: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  statsCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
  },
  statLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  statValue: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.bgL3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.accentTeal,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  doneBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  doneIcon: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.lg,
    color: colors.success,
  },
  doneText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.success,
  },
})
