/**
 * CategoryBadge — compact pill showing Been / Want to Go / Lived.
 * been → teal, want_to_go → violet, lived → amber.
 */

import React, { memo } from 'react'
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import type { PlaceCategory } from '@typedefs/database'

interface CategoryBadgeProps {
  category: PlaceCategory
  style?: StyleProp<ViewStyle>
}

const CATEGORY_CONFIG: Record<
  PlaceCategory,
  { label: string; bg: string; text: string }
> = {
  been: {
    label: 'Been',
    bg: `rgba(0,245,212,0.15)`,
    text: colors.accentTeal,
  },
  want_to_go: {
    label: 'Want to Go',
    bg: `rgba(167,139,250,0.15)`,
    text: colors.accentViolet,
  },
  lived: {
    label: 'Lived',
    bg: `rgba(245,166,35,0.15)`,
    text: colors.accentAmber,
  },
}

function CategoryBadgeInner({ category, style }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        style,
      ]}
    >
      <Text style={[styles.label, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.xs + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
})

export const CategoryBadge = memo(CategoryBadgeInner)
