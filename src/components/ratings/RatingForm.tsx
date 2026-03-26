/**
 * RatingForm — 10-category rating form as spring-animated bottom sheet.
 * Live overall score, circular progress ring, draggable to dismiss.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Svg, { Circle, Path as SvgPath } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import { RATING_CATEGORIES } from '@constants/ratingCategories'
import type { RatingCategory } from '@typedefs/database'
import { getCountryByCode } from '@constants/countries'
import { computeOverallScore } from '@services/ratings'
import { sanitizeReview } from '@lib/sanitize'
import { SpringButton } from '@components/ui/SpringButton'
import { StarRating } from './StarRating'
import type { PlaceCategory } from '@typedefs/database'

type LocalRatings = Partial<Record<RatingCategory, 1 | 2 | 3 | 4 | 5>>

interface RatingFormProps {
  cityName: string
  countryCode: string
  initialRatings?: LocalRatings
  initialCategory?: PlaceCategory
  onSubmit: (ratings: LocalRatings, review: string, category: PlaceCategory) => void
  onDismiss: () => void
}

const VISIT_TYPES: { key: PlaceCategory; label: string; emoji: string; color: string }[] = [
  { key: 'been',       label: 'Been',        emoji: '✓',  color: colors.accentTeal },
  { key: 'want_to_go', label: 'Want to Go',  emoji: '→',  color: colors.accentViolet },
  { key: 'lived',      label: 'Lived',       emoji: '⌂',  color: colors.accentAmber },
]

// Category icon SVG paths (unique Midnight Atlas style, inline)
const CATEGORY_ICONS: Record<string, string> = {
  compass: 'M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z',
  shield: 'M12 2 L20 6 L20 13 C20 17.4 16.4 21.2 12 22 C7.6 21.2 4 17.4 4 13 L4 6 Z',
  utensils: 'M7 2 L7 8 C7 10 9 11 9 11 L9 22 L11 22 L11 11 C11 11 13 10 13 8 L13 2 M17 2 L17 10 C17 12 15 12 15 12 L15 22 L17 22 L17 12',
  train: 'M6 2 L18 2 C19.1 2 20 2.9 20 4 L20 14 C20 15.1 19.1 16 18 16 L6 16 C4.9 16 4 15.1 4 14 L4 4 C4 2.9 4.9 2 6 2 M8 19 L6 22 M16 19 L18 22 M8 8 L8 12 M16 8 L16 12',
  handshake: 'M2 10 L10 10 L12 8 L14 10 L22 10 L22 16 L16 16 L12 20 L8 16 L2 16 Z',
  coins: 'M12 2 C8.7 2 6 3.6 6 6 C6 8.4 8.7 10 12 10 C15.3 10 18 8.4 18 6 C18 3.6 15.3 2 12 2 M6 6 L6 14 C6 16.4 8.7 18 12 18 C15.3 18 18 16.4 18 14 L18 6 M6 10 C6 12.4 8.7 14 12 14 C15.3 14 18 12.4 18 10',
  sparkles: 'M12 2 L13 9 L20 10 L13 11 L12 18 L11 11 L4 10 L11 9 Z M19 14 L19.5 17 L22 17.5 L19.5 18 L19 21 L18.5 18 L16 17.5 L18.5 17 Z M5 3 L5.5 5.5 L8 6 L5.5 6.5 L5 9 L4.5 6.5 L2 6 L4.5 5.5 Z',
  music: 'M9 18 C9 19.7 7.7 21 6 21 C4.3 21 3 19.7 3 18 C3 16.3 4.3 15 6 15 C7.7 15 9 16.3 9 18 M21 15 C21 16.7 19.7 18 18 18 C16.3 18 15 16.7 15 15 C15 13.3 16.3 12 18 12 C19.7 12 21 13.3 21 15 M9 18 L9 4 L21 2 L21 15',
  mountain: 'M3 20 L8 10 L12 16 L15 11 L21 20 Z',
  wifi: 'M12 18 C12 18 12 18 12 18 M5.3 14.7 C7.4 12.6 9.6 11.5 12 11.5 C14.4 11.5 16.6 12.6 18.7 14.7 M2 10.5 C5.4 7.1 8.7 5.5 12 5.5 C15.3 5.5 18.6 7.1 22 10.5 M8.5 17.3 C9.4 16.4 10.7 15.8 12 15.8 C13.3 15.8 14.6 16.4 15.5 17.3',
}

// Circular progress ring
function ScoreRing({ score, size = 80 }: { score: number | null; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = score ? (score / 5) * circumference : 0

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={4}
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.accentAmber}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.scoreNumber}>
        {score !== null ? score.toFixed(1) : '—'}
      </Text>
    </View>
  )
}

function CategoryIcon({ iconKey, size = 18 }: { iconKey: string; size?: number }) {
  const path = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS.compass

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <SvgPath
        d={path}
        fill="none"
        stroke={colors.textSecondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function RatingFormInner({
  cityName,
  countryCode,
  initialRatings = {},
  initialCategory = 'been',
  onSubmit,
  onDismiss,
}: RatingFormProps) {
  const [ratings, setRatings] = useState<LocalRatings>(initialRatings)
  const [review, setReview] = useState('')
  const [visitCategory, setVisitCategory] = useState<PlaceCategory>(initialCategory)
  const translateY = useSharedValue(600)
  const country = useMemo(() => getCountryByCode(countryCode), [countryCode])
  const scrollRef = useRef<ScrollView>(null)

  // Animate in on mount
  React.useEffect(() => {
    translateY.value = withSpring(0, springs.standard)
    return () => {
      translateY.value = 0
    }
  }, [translateY])

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const ratedCount = useMemo(
    () => Object.values(ratings).filter(Boolean).length,
    [ratings],
  )

  const overallScore = useMemo(
    () => computeOverallScore(ratings),
    [ratings],
  )

  const handleRatingChange = useCallback(
    (category: RatingCategory, score: number) => {
      setRatings((prev) => ({
        ...prev,
        [category]: score as 1 | 2 | 3 | 4 | 5,
      }))
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit(ratings, sanitizeReview(review), visitCategory)
  }, [ratings, review, visitCategory, onSubmit])

  const handleDismiss = useCallback(() => {
    translateY.value = withSpring(800, springs.standard, () => {
      runOnJS(onDismiss)()
    })
  }, [translateY, onDismiss])

  // Pan gesture to drag down to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY
      }
    })
    .onEnd((e) => {
      if (e.translationY > 150) {
        translateY.value = withSpring(800, springs.standard, () => {
          runOnJS(onDismiss)()
        })
      } else {
        translateY.value = withSpring(0, springs.standard)
      }
    })

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* City header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.cityName} numberOfLines={1}>
                {cityName}
              </Text>
              <Text style={styles.countryName}>
                {country?.flag} {country?.name}
              </Text>
              <Text style={styles.progress}>
                {ratedCount}/10 categories rated
              </Text>
            </View>
            <ScoreRing score={overallScore} size={72} />
          </View>

          {/* Visit type picker */}
          <View style={styles.visitTypePicker}>
            {VISIT_TYPES.map((vt) => {
              const active = visitCategory === vt.key
              return (
                <Pressable
                  key={vt.key}
                  onPress={() => setVisitCategory(vt.key)}
                  style={[
                    styles.visitTypeBtn,
                    active && { backgroundColor: vt.color + '22', borderColor: vt.color },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.visitTypeText, active && { color: vt.color }]}>
                    {vt.emoji} {vt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Category rows */}
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {RATING_CATEGORIES.map((cat) => (
              <View key={cat.key} style={styles.categoryRow}>
                <CategoryIcon iconKey={cat.icon} size={18} />
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <View style={styles.starContainer}>
                  <StarRating
                    value={ratings[cat.key as RatingCategory] ?? 0}
                    onChangeValue={(v) =>
                      handleRatingChange(cat.key as RatingCategory, v)
                    }
                    size={22}
                  />
                </View>
              </View>
            ))}

            {/* Review text area */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewLabelRow}>
                <Text style={styles.reviewLabel}>Written Review</Text>
                <View style={styles.privateBadge}>
                  <Text style={styles.privateBadgeText}>🔒 Private</Text>
                </View>
              </View>
              <TextInput
                style={styles.reviewInput}
                multiline
                numberOfLines={4}
                placeholder="Share your experience..."
                placeholderTextColor={colors.textTertiary}
                value={review}
                onChangeText={(t) => setReview(t.slice(0, 2000))}
                maxLength={2000}
              />
              <Text style={styles.charCount}>{review.length}/2000</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <SpringButton
                variant="ghost"
                onPress={handleDismiss}
                style={styles.dismissBtn}
              >
                Dismiss
              </SpringButton>
              <SpringButton
                variant="primary"
                onPress={handleSubmit}
                style={styles.saveBtn}
              >
                Save Rating
              </SpringButton>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: colors.bgL1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.glassBorder,
    maxHeight: '92%',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgL3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  cityName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  countryName: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progress: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.accentTeal,
    marginTop: spacing.xs,
  },
  scoreNumber: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    color: colors.accentAmber,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.sm,
  },
  categoryLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  starContainer: {
    alignItems: 'flex-end',
  },
  reviewSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  visitTypePicker: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  visitTypeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    backgroundColor: colors.bgL2,
  },
  visitTypeText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs + 1,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  reviewLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  privateBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  privateBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
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
    minHeight: 96,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  dismissBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
})

export const RatingForm = memo(RatingFormInner)
