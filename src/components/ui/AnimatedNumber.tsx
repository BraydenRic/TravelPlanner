/**
 * AnimatedNumber — springs from 0 to target value on mount/change.
 * Renders in JetBrains Mono (fallback: SpaceMono / Courier New).
 */

import React, { memo, useEffect } from 'react'
import { StyleProp, Text, TextStyle } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedProps,
} from 'react-native-reanimated'
import { springs } from '@theme/animations'
import { colors } from '@theme/colors'
import { fontFamily } from '@theme/typography'

// We use a custom text component approach with Reanimated
// AnimatedText for smooth number interpolation
const AnimatedText = Animated.createAnimatedComponent(Text)

interface AnimatedNumberProps {
  value: number
  /** Decimal places: 0 or 1. Default: 0 */
  decimals?: 0 | 1
  style?: StyleProp<TextStyle>
  /** Optional suffix appended after number, e.g., "%" */
  suffix?: string
  /** Spring duration hint (ms) — controls stiffness indirectly */
  duration?: number
}

function AnimatedNumberInner({
  value,
  decimals = 0,
  style,
  suffix = '',
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0)

  useEffect(() => {
    animatedValue.value = withSpring(value, springs.standard)
  }, [value, animatedValue])

  // We drive a JS-side counter via a worklet-driven listener approach.
  // For simplicity and test compatibility, use a derived animated text.
  const animatedProps = useAnimatedProps(() => {
    const display = decimals === 1
      ? animatedValue.value.toFixed(1)
      : Math.round(animatedValue.value).toString()
    return { text: `${display}${suffix}` } as { text: string }
  })

  const AT = AnimatedText as unknown as React.ComponentType<{
    style?: StyleProp<TextStyle>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    animatedProps?: any
  }>

  return (
    <AT
      style={[
        {
          fontFamily: fontFamily.mono,
          color: colors.textPrimary,
        },
        style,
      ]}
      animatedProps={animatedProps}
    />
  )
}

export const AnimatedNumber = memo(AnimatedNumberInner)
