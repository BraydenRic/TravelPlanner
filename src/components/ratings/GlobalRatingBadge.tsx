/**
 * GlobalRatingBadge — Large circular badge with score + progress ring.
 * Score in JetBrains Mono, amber ring fills proportional to score/5.
 */

import React, { memo, useEffect } from 'react'
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedProps,
} from 'react-native-reanimated'
import { colors } from '@theme/colors'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface GlobalRatingBadgeProps {
  score: number // 0–5
  size?: 'large' | 'small'
  label?: string
  style?: StyleProp<ViewStyle>
}

// Tiny star SVG path
const STAR_PATH = 'M8,1 L10,6 L16,6.5 L11.5,10.5 L13,16 L8,13 L3,16 L4.5,10.5 L0,6.5 L6,6 Z'

function GlobalRatingBadgeInner({
  score,
  size = 'large',
  label,
  style,
}: GlobalRatingBadgeProps) {
  const isLarge = size === 'large'
  const containerSize = isLarge ? 88 : 56
  const svgRadius = (containerSize - 8) / 2
  const circumference = 2 * Math.PI * svgRadius
  const strokeWidth = isLarge ? 5 : 4

  const progressAnim = useSharedValue(0)

  useEffect(() => {
    progressAnim.value = withSpring(score / 5, springs.gentle)
    return () => {
      progressAnim.value = 0
    }
  }, [score, progressAnim])

  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - progressAnim.value * circumference,
  }))

  return (
    <View style={[{ width: containerSize, height: containerSize }, style]}>
      <Svg
        width={containerSize}
        height={containerSize}
        style={StyleSheet.absoluteFill}
      >
        {/* Background ring */}
        <Circle
          cx={containerSize / 2}
          cy={containerSize / 2}
          r={svgRadius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress ring */}
        <AnimatedCircle
          cx={containerSize / 2}
          cy={containerSize / 2}
          r={svgRadius}
          fill="none"
          stroke={colors.accentAmber}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          // Rotate so progress starts at top
          transform={`rotate(-90 ${containerSize / 2} ${containerSize / 2})`}
          animatedProps={animatedRingProps}
        />

        {/* Star icon below number — positioned at bottom */}
        {isLarge && (
          <Path
            d={STAR_PATH}
            fill={colors.accentAmber}
            opacity={0.8}
            transform={`translate(${containerSize / 2 - 8}, ${containerSize / 2 + 14}) scale(1)`}
          />
        )}
      </Svg>

      {/* Score text */}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.scoreText,
            { fontSize: isLarge ? 32 : 20 },
          ]}
        >
          {score > 0 ? score.toFixed(1) : '—'}
        </Text>
        {label && (
          <Text style={styles.label}>{label}</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },
  scoreText: {
    fontFamily: fontFamily.mono,
    color: colors.accentAmber,
    letterSpacing: -1,
  },
  label: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
})

export const GlobalRatingBadge = memo(GlobalRatingBadgeInner)
