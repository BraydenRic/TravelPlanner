/**
 * GlassPanel — Glassmorphic container with backdrop blur.
 * Midnight Atlas design system: rgba(15,17,23,0.72) + blur(24px).
 */

import React, { memo } from 'react'
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { colors } from '@theme/colors'
import { borderRadius, borderWidth } from '@theme/spacing'

interface GlassPanelProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Blur intensity 0–1 (scales backdrop blur and background opacity). Default: 1 */
  intensity?: number
  borderRadius?: number
}

function GlassPanelInner({
  children,
  style,
  intensity = 1,
  borderRadius: br = borderRadius.lg,
}: GlassPanelProps) {
  // Use theme glass color, scaling opacity by intensity
  // colors.glass is already an rgba string; for intensity < 1 we use bgL1 with reduced opacity
  const backgroundColor = intensity >= 1
    ? colors.glass
    : `rgba(36,40,55,${(0.80 * intensity).toFixed(2)})`

  const webStyle = Platform.select({
    web: {
      backdropFilter: `blur(${Math.round(24 * intensity)}px)`,
      WebkitBackdropFilter: `blur(${Math.round(24 * intensity)}px)`,
    } as ViewStyle,
    default: {},
  })

  return (
    <View
      style={[
        styles.base,
        { backgroundColor, borderRadius: br },
        webStyle,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: borderWidth.thin,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
})

export const GlassPanel = memo(GlassPanelInner)
