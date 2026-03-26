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
  const bgOpacity = 0.72 * intensity
  const backgroundColor = `rgba(15,17,23,${bgOpacity.toFixed(2)})`

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
