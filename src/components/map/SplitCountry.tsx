/**
 * SplitCountry — Country SVG split into segments for group members.
 * 1 member: full fill. 2: vertical halves. 3: thirds. 4: quadrants.
 */

import React, { memo } from 'react'
import Svg, { Path, Defs, ClipPath, Rect, G } from 'react-native-svg'
import type { MemberColor } from '@typedefs/database'

interface MemberSegment {
  color: MemberColor
  fillRatio: number
}

interface SplitCountryProps {
  countryCode: string
  members: MemberSegment[]
  path: string // SVG path string for the country shape
  width?: number
  height?: number
}

function SplitCountryInner({
  countryCode,
  members,
  path,
  width = 100,
  height = 60,
}: SplitCountryProps) {
  const count = Math.min(members.length, 4)

  if (count === 0) return null

  // Clip regions based on member count
  const clips = getClipRects(count, width, height)

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        {clips.map((rect, i) => (
          <ClipPath key={i} id={`${countryCode}-clip-${i}`}>
            <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
          </ClipPath>
        ))}
      </Defs>

      {/* Base path (outline) */}
      <Path
        d={path}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={0.9}
      />

      {/* Member segments */}
      {members.slice(0, 4).map((member, i) => {
        const opacity = 0.2 + member.fillRatio * 0.6
        return (
          <G key={i} clipPath={`url(#${countryCode}-clip-${i})`}>
            <Path
              d={path}
              fill={member.color}
              opacity={opacity}
              stroke="none"
            />
          </G>
        )
      })}

      {/* Top stroke outline over all fills */}
      <Path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={0.9}
      />
    </Svg>
  )
}

interface ClipRect {
  x: number
  y: number
  w: number
  h: number
}

function getClipRects(count: number, w: number, h: number): ClipRect[] {
  switch (count) {
    case 1:
      return [{ x: 0, y: 0, w, h }]
    case 2:
      return [
        { x: 0, y: 0, w: w / 2, h },
        { x: w / 2, y: 0, w: w / 2, h },
      ]
    case 3:
      return [
        { x: 0, y: 0, w: w / 3, h },
        { x: w / 3, y: 0, w: w / 3, h },
        { x: (w * 2) / 3, y: 0, w: w / 3, h },
      ]
    case 4:
      return [
        { x: 0, y: 0, w: w / 2, h: h / 2 },
        { x: w / 2, y: 0, w: w / 2, h: h / 2 },
        { x: 0, y: h / 2, w: w / 2, h: h / 2 },
        { x: w / 2, y: h / 2, w: w / 2, h: h / 2 },
      ]
    default:
      return [{ x: 0, y: 0, w, h }]
  }
}

export const SplitCountry = memo(SplitCountryInner)
