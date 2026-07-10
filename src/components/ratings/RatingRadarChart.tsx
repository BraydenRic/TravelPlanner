/**
 * RatingRadarChart — 10-axis spider/radar chart using react-native-svg.
 * Animated grow-in on mount, optional group member overlays.
 *
 * The entrance animates the wrapping view (scale + opacity), never SVG
 * attributes: useAnimatedProps on react-native-svg elements crashes under
 * Reanimated 4's new architecture (the v3 JS fallback path is gone).
 */

import React, { memo, useEffect, useMemo } from 'react'
import { Platform, StyleProp, ViewStyle } from 'react-native'
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { colors } from '@theme/colors'
import { fontFamily } from '@theme/typography'
import { springs } from '@theme/animations'
import { RATING_CATEGORIES } from '@constants/ratingCategories'
import type { RatingCategory, MemberColor } from '@typedefs/database'

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

// Short labels that fit within the SVG bounds at small sizes
const RADAR_SHORT_LABEL: Record<string, string> = {
  overall_experience: 'Overall',
  safety: 'Safety',
  food_cuisine: 'Food',
  transportation: 'Transit',
  friendliness: 'Friend.',
  affordability: 'Afford.',
  cleanliness: 'Clean',
  nightlife_entertainment: 'Night',
  natural_beauty: 'Nature',
  wifi_connectivity: 'Wi-Fi',
}

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
  const maxR = size / 2 - 50 // leave room for labels; clipping avoidance

  const ratingValues = useMemo(
    () => RATING_CATEGORIES.map((cat) => ratings[cat.key as RatingCategory] ?? 0),
    [ratings],
  )

  // Grow the whole chart in from the center on mount
  const scaleAnim = useSharedValue(0.6)
  const opacityAnim = useSharedValue(0)
  useEffect(() => {
    scaleAnim.value = withSpring(1, springs.gentle)
    opacityAnim.value = withSpring(1, springs.standard)
    return () => {
      scaleAnim.value = 0.6
      opacityAnim.value = 0
    }
  }, [scaleAnim, opacityAnim])

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }))

  const dataPoints = ratingsToPoints(cx, cy, maxR, ratingValues)

  // Grid concentric polygons
  const gridLevels = Array.from({ length: LEVELS }, (_, i) => (i + 1) / LEVELS)

  return (
    <Animated.View style={[{ width: size, height: size }, style, entranceStyle]}>
      <Svg
        width={size}
        height={size}
        style={Platform.OS === 'web' ? ({ overflow: 'visible' } as object) : undefined}
      >
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

        {/* Main data polygon */}
        <Polygon
          points={dataPoints}
          fill={`${colors.accentTeal}4D`}
          stroke={colors.accentTeal}
          strokeWidth={2}
        />

        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={2} fill={colors.accentTeal} opacity={0.6} />

        {/* Category labels — medium weight and primary color: at radar-label
            sizes anything dimmer disappears into the dark bg */}
        {RATING_CATEGORIES.map((cat, i) => {
          const labelR = maxR + 18
          const pt = polarToCartesian(cx, cy, labelR, i, NUM_AXES)
          const isRight = pt.x > cx + 10
          const isLeft = pt.x < cx - 10
          const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle'
          const shortLabel = RADAR_SHORT_LABEL[cat.key] ?? cat.label.split(' ')[0]

          return (
            <SvgText
              key={cat.key}
              x={pt.x}
              y={pt.y + 4}
              fontSize={11}
              fill={colors.textPrimary}
              textAnchor={textAnchor}
              fontFamily={fontFamily.medium}
            >
              {shortLabel}
            </SvgText>
          )
        })}
      </Svg>
    </Animated.View>
  )
}

export const RatingRadarChart = memo(RatingRadarChartInner)
