/**
 * SpringButton — Pressable with spring scale bounce.
 * Spring physics only (damping:15, stiffness:150). Haptic on press.
 */

import React, { memo, useCallback } from 'react'
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, borderWidth, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface SpringButtonProps {
  onPress: () => void
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  variant?: ButtonVariant
  disabled?: boolean
  accessibilityLabel?: string
}

function SpringButtonInner({
  onPress,
  children,
  style,
  textStyle,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
}: SpringButtonProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, springs.snappy)
  }, [scale])

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1.0, springs.standard)
  }, [scale])

  const handlePress = useCallback(() => {
    if (disabled) return
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }, [disabled, onPress])

  const variantStyle = disabled
    ? styles.disabled
    : variant === 'primary'
    ? styles.primary
    : variant === 'secondary'
    ? styles.secondary
    : styles.ghost

  const variantTextStyle =
    variant === 'primary'
      ? styles.primaryText
      : variant === 'secondary'
      ? styles.secondaryText
      : styles.ghostText

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[styles.base, variantStyle, animatedStyle, style]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, variantTextStyle, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: borderRadius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smmd,
  },
  primary: {
    backgroundColor: colors.accentTeal,
  },
  secondary: {
    backgroundColor: colors.glass,
    borderWidth: borderWidth.thin,
    borderColor: colors.accentTeal,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  disabled: {
    backgroundColor: colors.bgL3,
    opacity: 0.5,
  },
  text: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    letterSpacing: 0.2,
  },
  primaryText: {
    color: colors.bgL0,
  },
  secondaryText: {
    color: colors.accentTeal,
  },
  ghostText: {
    color: colors.accentTeal,
  },
})

export const SpringButton = memo(SpringButtonInner)
