/**
 * StarRating — Interactive 1-5 star rating with custom SVG stars.
 * Custom SVG path, amber fill, half-star support, spring bounce + haptic.
 */

import React, { memo, useCallback } from 'react'
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { springs } from '@theme/animations'

// Custom SVG star path — NOT from an icon library
const STAR_PATH = 'M12,2 L15.09,8.26 L22,9.27 L17,14.14 L18.18,21.02 L12,17.77 L5.82,21.02 L7,14.14 L2,9.27 L8.91,8.26 Z'

interface StarRatingProps {
  value: number // 0–5, supports .5 for half
  onChangeValue?: (value: number) => void
  readonly?: boolean
  size?: number
  color?: string
  style?: StyleProp<ViewStyle>
}

interface StarProps {
  index: number // 1-based
  value: number
  size: number
  color: string
  onPress?: (v: number) => void
  readonly?: boolean
}

function AnimatedStar({ index, value, size, color, onPress, readonly }: StarProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePress = useCallback(() => {
    if (readonly) return
    scale.value = withSpring(1.3, springs.bouncy, () => {
      scale.value = withSpring(1.0, springs.standard)
    })
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress?.(index)
  }, [readonly, scale, onPress, index])

  // Determine fill: full, half, or empty
  const fill = value >= index
    ? 'full'
    : value >= index - 0.5
    ? 'half'
    : 'empty'

  const clipId = `star-clip-${index}`

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        onPress={handlePress}
        disabled={readonly}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        accessibilityRole={readonly ? 'text' : 'button'}
        accessibilityLabel={`${index} star${index !== 1 ? 's' : ''}`}
      >
        <Svg width={size} height={size} viewBox="0 0 24 24">
          {fill === 'half' && (
            <Defs>
              <ClipPath id={clipId}>
                <Rect x="0" y="0" width="12" height="24" />
              </ClipPath>
            </Defs>
          )}

          {/* Empty star background */}
          <Path
            d={STAR_PATH}
            fill="rgba(255,255,255,0.15)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="0.5"
          />

          {/* Filled overlay */}
          {fill === 'full' && (
            <Path
              d={STAR_PATH}
              fill={color}
              opacity={0.95}
            />
          )}

          {fill === 'half' && (
            <Path
              d={STAR_PATH}
              fill={color}
              clipPath={`url(#${clipId})`}
              opacity={0.95}
            />
          )}
        </Svg>
      </Pressable>
    </Animated.View>
  )
}

function StarRatingInner({
  value,
  onChangeValue,
  readonly = false,
  size = 24,
  color = colors.accentAmber,
  style,
}: StarRatingProps) {
  const handleStarPress = useCallback((starIndex: number) => {
    onChangeValue?.(starIndex)
  }, [onChangeValue])

  return (
    <View style={[styles.row, style]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <AnimatedStar
          key={i}
          index={i}
          value={value}
          size={size}
          color={color}
          onPress={handleStarPress}
          readonly={readonly}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
})

export const StarRating = memo(StarRatingInner)
