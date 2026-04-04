/**
 * RatingForm — Full-screen rating form with back button.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Svg, { Circle, Path as SvgPath } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { RATING_CATEGORIES } from '@constants/ratingCategories'
import type { RatingCategory, PlaceCategory } from '@typedefs/database'
import { getCountryByCode } from '@constants/countries'
import { computeOverallScore } from '@services/ratings'
import { sanitizeReview } from '@lib/sanitize'
import { SpringButton } from '@components/ui/SpringButton'
import { GlassPanel } from '@components/ui/GlassPanel'
import { StarRating } from './StarRating'

type LocalRatings = Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>

interface RatingFormProps {
  cityName: string
  countryCode: string
  initialRatings?: LocalRatings
  category: PlaceCategory
  error?: string | null
  onSubmit: (ratings: LocalRatings, review: string) => void
  onDismiss: () => void
}

const CATEGORY_ICONS: Record<string, string> = {
  compass:   'M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z',
  shield:    'M12 2 L20 6 L20 13 C20 17.4 16.4 21.2 12 22 C7.6 21.2 4 17.4 4 13 L4 6 Z',
  utensils:  'M7 2 L7 8 C7 10 9 11 9 11 L9 22 L11 22 L11 11 C11 11 13 10 13 8 L13 2 M17 2 L17 10 C17 12 15 12 15 12 L15 22 L17 22 L17 12',
  train:     'M6 2 L18 2 C19.1 2 20 2.9 20 4 L20 14 C20 15.1 19.1 16 18 16 L6 16 C4.9 16 4 15.1 4 14 L4 4 C4 2.9 4.9 2 6 2 M8 19 L6 22 M16 19 L18 22 M8 8 L8 12 M16 8 L16 12',
  handshake: 'M2 10 L10 10 L12 8 L14 10 L22 10 L22 16 L16 16 L12 20 L8 16 L2 16 Z',
  coins:     'M12 2 C8.7 2 6 3.6 6 6 C6 8.4 8.7 10 12 10 C15.3 10 18 8.4 18 6 C18 3.6 15.3 2 12 2 M6 6 L6 14 C6 16.4 8.7 18 12 18 C15.3 18 18 16.4 18 14 L18 6 M6 10 C6 12.4 8.7 14 12 14 C15.3 14 18 12.4 18 10',
  sparkles:  'M12 2 L13 9 L20 10 L13 11 L12 18 L11 11 L4 10 L11 9 Z M19 14 L19.5 17 L22 17.5 L19.5 18 L19 21 L18.5 18 L16 17.5 L18.5 17 Z M5 3 L5.5 5.5 L8 6 L5.5 6.5 L5 9 L4.5 6.5 L2 6 L4.5 5.5 Z',
  music:     'M9 18 C9 19.7 7.7 21 6 21 C4.3 21 3 19.7 3 18 C3 16.3 4.3 15 6 15 C7.7 15 9 16.3 9 18 M21 15 C21 16.7 19.7 18 18 18 C16.3 18 15 16.7 15 15 C15 13.3 16.3 12 18 12 C19.7 12 21 13.3 21 15 M9 18 L9 4 L21 2 L21 15',
  mountain:  'M3 20 L8 10 L12 16 L15 11 L21 20 Z',
  wifi:      'M12 18 C12 18 12 18 12 18 M5.3 14.7 C7.4 12.6 9.6 11.5 12 11.5 C14.4 11.5 16.6 12.6 18.7 14.7 M2 10.5 C5.4 7.1 8.7 5.5 12 5.5 C15.3 5.5 18.6 7.1 22 10.5 M8.5 17.3 C9.4 16.4 10.7 15.8 12 15.8 C13.3 15.8 14.6 16.4 15.5 17.3',
}

const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  been:       colors.accentTeal,
  want_to_go: colors.accentViolet,
  lived:      colors.accentAmber,
}

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  been:       'Been Here',
  want_to_go: 'Want to Go',
  lived:      'Lived Here',
}

function CategoryIcon({ iconKey, color }: { iconKey: string; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <SvgPath
        d={CATEGORY_ICONS[iconKey] ?? CATEGORY_ICONS.compass}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ScoreRing({ score, size = 72, color }: { score: number | null; size?: number; color: string }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = score ? (score / 5) * circumference : 0

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4}
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.scoreNumber, { color }]}>
        {score !== null ? score.toFixed(1) : '—'}
      </Text>
    </View>
  )
}

function RatingFormInner({
  cityName,
  countryCode,
  initialRatings = {},
  category,
  error,
  onSubmit,
  onDismiss,
}: RatingFormProps) {
  const [ratings, setRatings] = useState<LocalRatings>(initialRatings)
  const [review, setReview] = useState('')

  // Sync when initialRatings load asynchronously (e.g. from DB fetch after mount)
  useEffect(() => {
    if (Object.keys(initialRatings).length > 0) setRatings(initialRatings)
  }, [initialRatings])
  const [showReview, setShowReview] = useState(false)
  const country = useMemo(() => getCountryByCode(countryCode), [countryCode])
  const scrollRef = useRef<ScrollView>(null)

  const catColor = CATEGORY_COLOR[category]
  const catLabel = CATEGORY_LABEL[category]

  const ratedCount = useMemo(
    () => Object.values(ratings).filter(Boolean).length,
    [ratings],
  )

  const overallScore = useMemo(() => computeOverallScore(ratings), [ratings])

  const handleRatingChange = useCallback(
    (cat: RatingCategory, score: number) => {
      setRatings((prev) => ({ ...prev, [cat]: score as 1 | 2 | 3 | 4 | 5 }))
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit(ratings, sanitizeReview(review))
  }, [ratings, review, onSubmit])

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onDismiss()
  }, [onDismiss])

  return (
    <View style={styles.container}>
      {/* Error banner */}
      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Top nav */}
      <View style={styles.topNav}>
        <GlassPanel style={styles.backBtn}>
          <Pressable onPress={handleBack} style={styles.backPressable}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        </GlassPanel>

        <View style={styles.topNavRight}>
          <View style={[styles.categoryPill, { borderColor: catColor + '60' }]}>
            <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
            <Text style={[styles.categoryPillText, { color: catColor }]}>{catLabel}</Text>
          </View>
        </View>
      </View>

      {/* City header */}
      <View style={styles.cityHeader}>
        <View style={styles.cityHeaderLeft}>
          <View>
            <Text style={styles.cityName} numberOfLines={1}>{cityName}</Text>
            <Text style={styles.countryName}>{country?.name}</Text>
          </View>
        </View>
        <ScoreRing score={overallScore} size={72} color={catColor} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: catColor }]}>
          {ratedCount === 0
            ? 'All ratings optional — tap stars to rate'
            : `${ratedCount}/10 categories rated`}
        </Text>
      </View>

      {/* Rating list */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {RATING_CATEGORIES.map((cat, i) => (
          <View
            key={cat.key}
            style={[
              styles.categoryRow,
              i === RATING_CATEGORIES.length - 1 && styles.categoryRowLast,
            ]}
          >
            <CategoryIcon iconKey={cat.icon} color={catColor} />
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            <StarRating
              value={ratings[cat.key as RatingCategory] ?? 0}
              onChangeValue={(v) => handleRatingChange(cat.key as RatingCategory, v)}
              size={28}
            />
          </View>
        ))}

        {/* Notes toggle */}
        <Pressable
          style={styles.reviewToggle}
          onPress={() => setShowReview((v) => !v)}
        >
          <Text style={styles.reviewToggleText}>
            {showReview ? '▾ Hide notes' : '▸ Add notes (private)'}
          </Text>
        </Pressable>

        {showReview && (
          <View style={styles.reviewSection}>
            <TextInput
              style={styles.reviewInput}
              multiline
              numberOfLines={4}
              placeholder="Jot down anything you want to remember..."
              placeholderTextColor={colors.textTertiary}
              value={review}
              onChangeText={(t) => setReview(t.slice(0, 2000))}
              maxLength={2000}
              autoFocus
            />
            <Text style={styles.charCount}>{review.length}/2000 · 🔒 Only visible to you</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Sticky save footer */}
      <View style={styles.footer}>
        <SpringButton variant="primary" onPress={handleSubmit} style={styles.saveBtn}>
          Save
        </SpringButton>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgL0,
    zIndex: 100,
  },
  // ── Error banner ──────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: 'rgba(255,80,80,0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,80,80,0.30)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: '#FF6B6B',
  },
  // ── Top nav ───────────────────────────────────────────────────────
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    borderRadius: borderRadius.full,
  },
  backPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  backArrow: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  topNavRight: {
    alignItems: 'flex-end',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryPillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    letterSpacing: 0.2,
  },
  // ── City header ───────────────────────────────────────────────────
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
  },
  cityHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cityName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  countryName: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreNumber: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  // ── Progress ──────────────────────────────────────────────────────
  progressRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  progressText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    opacity: 0.9,
  },
  // ── Rating rows ───────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: spacing.sm,
  },
  categoryRowLast: {
    borderBottomWidth: 0,
  },
  categoryLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    flex: 1,
  },
  // ── Notes ────────────────────────────────────────────────────────
  reviewToggle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  reviewToggleText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  reviewSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  reviewInput: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  // ── Footer ───────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    backgroundColor: colors.bgL0,
  },
  saveBtn: {
    width: '100%',
  },
})

export const RatingForm = memo(RatingFormInner)
