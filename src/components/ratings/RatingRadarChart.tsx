/**
 * RatingRadarChart — 10-axis spider/radar chart using react-native-svg.
 * Animated draw-in on mount, optional group member overlays.
 */

import React, { memo, useEffect, useMemo } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedProps,
} from 'react-native-reanimated'
import { colors } from '@theme/colors'
import { fontFamily } from '@theme/typography'
import { springs } from '@theme/animations'
import { RATING_CATEGORIES } from '@constants/ratingCategories'
import type { RatingCategory, MemberColor } from '@typedefs/database'

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon)

interface MemberRadar {
  color: MemberColor
  ratings: Record<RatingCategory, number>
}

interface RatingRadarChartProps {
  ratings: Record<RatingCategory, number>
  groupRatings?: MemberRadar[]
  size?: number
  style?: StyleProp<ViewStyle>
}

const NUM_AXES = 10
const LEVELS = 5 // concentric rings

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleIndex: number,
  total: number,
) {
  // Start at top (-90 degrees) and go clockwise
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function ratingsToPoints(
  cx: number,
  cy: number,
  maxR: number,
  ratingValues: number[],
): string {
  return ratingValues
    .map((val, i) => {
      const r = (val / 5) * maxR
      const pt = polarToCartesian(cx, cy, r, i, NUM_AXES)
      return `${pt.x},${pt.y}`
    })
    .join(' ')
}

function RatingRadarChartInner({
  ratings,
  groupRatings,
  size = 240,
  style,
}: RatingRadarChartProps) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 28 // leave room for labels

  const ratingValues = useMemo(
    () => RATING_CATEGORIES.map((cat) => ratings[cat.key as RatingCategory] ?? 0),
    [ratings],
  )

  // Animate scale from 0 to 1 on mount
  const scaleAnim = useSharedValue(0)
  useEffect(() => {
    scaleAnim.value = withSpring(1, springs.gentle)
    return () => {
      scaleAnim.value = 0
    }
  }, [scaleAnim])

  const animatedProps = useAnimatedProps(() => {
    // Interpolate from center point to actual polygon
    const interpolatedValues = ratingValues.map((v) => v * scaleAnim.value)
    return {
      points: ratingsToPoints(cx, cy, maxR, interpolatedValues),
    }
  })

  // Grid concentric polygons
  const gridLevels = Array.from({ length: LEVELS }, (_, i) => (i + 1) / LEVELS)

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {gridLevels.map((level, li) => {
          const points = Array.from({ length: NUM_AXES }, (_, i) => {
            const pt = polarToCartesian(cx, cy, maxR * level, i, NUM_AXES)
            return `${pt.x},${pt.y}`
          }).join(' ')
          return (
            <Polygon
              key={li}
              points={points}
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Axis lines */}
        {Array.from({ length: NUM_AXES }, (_, i) => {
          const outer = polarToCartesian(cx, cy, maxR, i, NUM_AXES)
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Group member polygons (background) */}
        {groupRatings?.map((member, mi) => {
          const memberValues = RATING_CATEGORIES.map(
            (cat) => member.ratings[cat.key as RatingCategory] ?? 0,
          )
          const pts = ratingsToPoints(cx, cy, maxR, memberValues)
          return (
            <Polygon
              key={mi}
              points={pts}
              fill={`${member.color}40`}
              stroke={member.color}
              strokeWidth={1.5}
              opacity={0.7}
            />
          )
        })}

        {/* Main data polygon — animated */}
        <AnimatedPolygon
          animatedProps={animatedProps}
          fill={`${colors.accentTeal}4D`}
          stroke={colors.accentTeal}
          strokeWidth={2}
        />

        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={2} fill={colors.accentTeal} opacity={0.6} />

        {/* Category labels */}
        {RATING_CATEGORIES.map((cat, i) => {
          const labelR = maxR + 14
          const pt = polarToCartesian(cx, cy, labelR, i, NUM_AXES)
          const isRight = pt.x > cx + 10
          const isLeft = pt.x < cx - 10
          const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle'
          const shortLabel = cat.label.split(' ')[0]

          return (
            <SvgText
              key={cat.key}
              x={pt.x}
              y={pt.y + 3}
              fontSize={8}
              fill={colors.textTertiary}
              textAnchor={textAnchor}
              fontFamily={fontFamily.body}
            >
              {shortLabel}
            </SvgText>
          )
        })}
      </Svg>
    </View>
  )
}

export const RatingRadarChart = memo(RatingRadarChartInner)
