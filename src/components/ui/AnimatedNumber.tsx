/**
 * AnimatedNumber — springs from 0 to target value on mount/change.
 * Uses useAnimatedReaction + runOnJS so the text renders on web and native.
 */

import React, { memo, useEffect, useState } from 'react'
import { StyleProp, Text, TextStyle } from 'react-native'
import {
  useSharedValue,
  withSpring,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated'
import { springs } from '@theme/animations'
import { colors } from '@theme/colors'
import { fontFamily } from '@theme/typography'

interface AnimatedNumberProps {
  value: number
  /** Decimal places: 0 or 1. Default: 0 */
  decimals?: 0 | 1
  style?: StyleProp<TextStyle>
  /** Optional suffix appended after number, e.g., "%" */
  suffix?: string
}

function AnimatedNumberInner({
  value,
  decimals = 0,
  style,
  suffix = '',
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0)
  const [displayed, setDisplayed] = useState(
    decimals === 1 ? value.toFixed(1) : Math.round(value).toString(),
  )

  useEffect(() => {
    animatedValue.value = withSpring(value, springs.standard)
  }, [value, animatedValue])

  useAnimatedReaction(
    () => animatedValue.value,
    (current) => {
      const text =
        decimals === 1 ? current.toFixed(1) : Math.round(current).toString()
      runOnJS(setDisplayed)(text)
    },
  )

  return (
    <Text
      style={[
        {
          fontFamily: fontFamily.mono,
          color: colors.textPrimary,
        },
        style,
      ]}
    >
      {displayed}{suffix}
    </Text>
  )
}

export const AnimatedNumber = memo(AnimatedNumberInner)
