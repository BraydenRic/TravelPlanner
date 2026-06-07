/**
 * CategoryTabs — "Been / Want to Go / Lived" tab switcher.
 * Each tab is its own solid pill — no animated sliding indicator (unreliable on web).
 */

import React, { memo, useCallback } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, borderWidth, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import type { PlaceCategory } from '@typedefs/database'

interface CategoryTabsProps {
  activeCategory: PlaceCategory
  onCategoryChange: (cat: PlaceCategory) => void
  style?: StyleProp<ViewStyle>
}

const CATEGORIES: { key: PlaceCategory; label: string; activeBg: string }[] = [
  { key: 'been',       label: 'Been',   activeBg: colors.accentTeal },
  { key: 'want_to_go', label: 'Want',   activeBg: colors.accentViolet },
  { key: 'lived',      label: 'Lived',  activeBg: colors.accentAmber },
]

function CategoryTabsInner({ activeCategory, onCategoryChange, style }: CategoryTabsProps) {
  const handlePress = useCallback(
    (key: PlaceCategory) => {
      if (Platform.OS !== 'web') void Haptics.selectionAsync()
      onCategoryChange(key)
    },
    [onCategoryChange],
  )

  return (
    <View style={[styles.container, style]} testID="category-tabs" data-testid="category-tabs">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.key
        return (
          <Pressable
            key={cat.key}
            onPress={() => handlePress(cat.key)}
            style={[styles.tab, isActive && { backgroundColor: cat.activeBg }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            testID={`tab-${cat.key}`}
            data-testid={`tab-${cat.key}`}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {cat.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.darkOverlay85,
    borderRadius: borderRadius.full,
    borderWidth: borderWidth.thin,
    borderColor: colors.whiteAlpha15,
    padding: 3,
    alignSelf: 'center',
    gap: 2,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as Record<string, string>,
      default: {},
    }),
  },
  tab: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm + 1,
    color: colors.whiteAlpha70,
    letterSpacing: 0.3,
  },
  activeLabel: {
    color: colors.bgL0,
    fontFamily: fontFamily.semibold,
  },
})

export const CategoryTabs = memo(CategoryTabsInner)
