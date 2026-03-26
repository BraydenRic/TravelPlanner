/**
 * Onboarding — 3-step flow: name → avatar → intro cards.
 */

import React, { useCallback, useState } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { SpringButton } from '@components/ui/SpringButton'
import { sanitizeDisplayName } from '@lib/sanitize'

const TOTAL_STEPS = 3

const INTRO_CARDS = [
  {
    title: 'Been',
    description: 'Track countries you\'ve visited and rate your experiences across 10 categories.',
    color: colors.accentTeal,
  },
  {
    title: 'Want to Go',
    description: 'Build your travel wishlist and plan future adventures.',
    color: colors.accentViolet,
  },
  {
    title: 'Lived',
    description: 'Mark places you\'ve called home and share them with your group.',
    color: colors.accentAmber,
  },
]

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [nameError, setNameError] = useState('')

  const goNext = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync()
    if (step === 0) {
      const sanitized = sanitizeDisplayName(displayName)
      if (sanitized.length < 2) {
        setNameError('Name must be at least 2 characters')
        return
      }
      setNameError('')
    }
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
    } else {
      router.replace('/(tabs)/map')
    }
  }, [step, displayName])

  const goBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync()
    if (step > 0) setStep((s) => s - 1)
  }, [step])

  const skip = useCallback(() => {
    router.replace('/(tabs)/map')
  }, [])

  return (
    <View style={styles.container}>
      {/* Skip */}
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <Pressable onPress={skip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Step content */}
      <View style={styles.stepContent}>
        {step === 0 && (
          <View style={styles.stepInner}>
            <Text style={styles.stepTitle}>What&apos;s your name?</Text>
            <Text style={styles.stepDesc}>
              This is how you&apos;ll appear to travel group members.
            </Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t)
                setNameError('')
              }}
              placeholder="Display name"
              placeholderTextColor={colors.textTertiary}
              maxLength={30}
              autoFocus
            />
            {nameError ? (
              <Text style={styles.error}>{nameError}</Text>
            ) : null}
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepInner}>
            <Text style={styles.stepTitle}>Add a photo</Text>
            <Text style={styles.stepDesc}>
              Optional — you can always add one later.
            </Text>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayName ? displayName[0].toUpperCase() : '?'}
              </Text>
            </View>
            <Pressable style={styles.uploadBtn}>
              <Text style={styles.uploadText}>Choose Photo</Text>
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepInner}>
            <Text style={styles.stepTitle}>Three ways to map</Text>
            <Text style={styles.stepDesc}>
              Tap any country on the map to categorize it.
            </Text>
            <View style={styles.introCards}>
              {INTRO_CARDS.map((card) => (
                <View
                  key={card.title}
                  style={[styles.introCard, { borderColor: `${card.color}40` }]}
                >
                  <View style={[styles.introCardDot, { backgroundColor: card.color }]} />
                  <View style={styles.introCardText}>
                    <Text style={[styles.introCardTitle, { color: card.color }]}>
                      {card.title}
                    </Text>
                    <Text style={styles.introCardDesc}>{card.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        {step > 0 ? (
          <SpringButton variant="ghost" onPress={goBack} style={styles.navBtn}>
            Back
          </SpringButton>
        ) : (
          <View style={styles.navBtn} />
        )}
        <SpringButton variant="primary" onPress={goNext} style={styles.navBtn}>
          {step === TOTAL_STEPS - 1 ? 'Get Started' : 'Next'}
        </SpringButton>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
    paddingTop: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgL3,
  },
  dotActive: {
    backgroundColor: colors.accentTeal,
    width: 18,
  },
  skipBtn: {
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepInner: {
    gap: spacing.lg,
  },
  stepTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  stepDesc: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  nameInput: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.lg,
    height: 56,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.bgL2,
    borderWidth: 2,
    borderColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.accentTeal,
  },
  uploadBtn: {
    alignSelf: 'center',
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  uploadText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.accentTeal,
  },
  introCards: {
    gap: spacing.sm,
  },
  introCard: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
  },
  introCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  introCardText: {
    flex: 1,
    gap: spacing.xs,
  },
  introCardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
  },
  introCardDesc: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navBtn: {
    flex: 1,
  },
})
