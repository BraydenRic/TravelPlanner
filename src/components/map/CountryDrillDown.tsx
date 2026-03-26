/**
 * CountryDrillDown — Zoomed-in country view with city pins.
 * Spring zoom-in entrance, staggered city pins, glass back button.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { FlashList } from '@shopify/flash-list'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs, stagger } from '@theme/animations'
import type { City, PlaceCategory, MemberColor } from '@typedefs/database'
import { getCountryByCode } from '@constants/countries'
import { GlassPanel } from '@components/ui/GlassPanel'
import { CategoryBadge } from '@components/ui/CategoryBadge'

export interface CityWithStatus {
  city: City
  isVisited: boolean
  category?: PlaceCategory
  overallScore?: number
  groupIndicators?: MemberColor[]
}

interface CountryDrillDownProps {
  countryCode: string
  cities: CityWithStatus[]
  onCityPress: (cityId: string) => void
  onDotPress?: (cityId: string) => void
  onBackPress: () => void
  groupMode?: boolean
}

interface CityRowProps {
  item: CityWithStatus
  index: number
  onPress: (cityId: string) => void
  onDotPress?: (cityId: string) => void
}

function CityRow({ item, index, onPress, onDotPress }: CityRowProps) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(8)

  useEffect(() => {
    const delay = index * stagger.fast + 200
    opacity.value = withDelay(delay, withSpring(1, springs.standard))
    translateY.value = withDelay(delay, withSpring(0, springs.standard))
    return () => {
      opacity.value = 0
      translateY.value = 8
    }
  }, [index, opacity, translateY])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const handlePress = useCallback(() => {
    onPress(item.city.id)
  }, [onPress, item.city.id])

  const handleDotPress = useCallback(() => {
    onDotPress?.(item.city.id)
  }, [onDotPress, item.city.id])

  return (
    <Animated.View style={[styles.cityListItem, animStyle]}>
      <Pressable
        onPress={handlePress}
        style={styles.cityRow}
        accessibilityRole="button"
      >
        <Pressable
          style={styles.cityDot}
          onPress={handleDotPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={item.isVisited ? 'Change visit type' : 'Mark as visited'}
        >
          <View
            style={[
              styles.dot,
              item.isVisited
                ? {
                    backgroundColor:
                      item.category === 'been'
                        ? colors.accentTeal
                        : item.category === 'lived'
                        ? colors.accentAmber
                        : colors.accentViolet,
                  }
                : styles.dotUnvisited,
            ]}
          />
        </Pressable>
        <View style={styles.cityInfo}>
          <Text style={styles.cityName}>{item.city.name}</Text>
          {item.city.is_capital && (
            <Text style={styles.capitalTag}>Capital</Text>
          )}
        </View>
        <View style={styles.cityRight}>
          {item.category && <CategoryBadge category={item.category} />}
          {item.overallScore !== undefined && (
            <Text style={styles.cityScore}>
              {item.overallScore.toFixed(1)}★
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  )
}

function CountryDrillDownInner({
  countryCode,
  cities,
  onCityPress,
  onDotPress,
  onBackPress,
  groupMode: _groupMode = false,
}: CountryDrillDownProps) {
  const country = useMemo(() => getCountryByCode(countryCode), [countryCode])

  // Entrance animation
  const entryScale = useSharedValue(0.3)
  const entryOpacity = useSharedValue(0)

  useEffect(() => {
    entryScale.value = withSpring(1, springs.gentle)
    entryOpacity.value = withSpring(1, springs.standard)
    return () => {
      entryScale.value = 0.3
      entryOpacity.value = 0
    }
  }, [entryScale, entryOpacity])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entryScale.value }],
    opacity: entryOpacity.value,
  }))

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onBackPress()
  }, [onBackPress])

  const handleCityPress = useCallback(
    (cityId: string) => {
      onCityPress(cityId)
    },
    [onCityPress],
  )

  const visitedCities = useMemo(
    () => cities.filter((c) => c.isVisited),
    [cities],
  )

  const renderCity = useCallback(
    ({ item, index }: { item: CityWithStatus; index: number }) => (
      <CityRow item={item} index={index} onPress={handleCityPress} onDotPress={onDotPress} />
    ),
    [handleCityPress, onDotPress],
  )

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Back button */}
      <GlassPanel style={styles.backButton}>
        <Pressable onPress={handleBack} style={styles.backPressable}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>World</Text>
        </Pressable>
      </GlassPanel>

      {/* Country header */}
      <View style={styles.countryHeader}>
        <Text style={styles.countryFlag}>{country?.flag}</Text>
        <View>
          <Text style={styles.countryName}>{country?.name}</Text>
          <Text style={styles.citiesSubtitle}>
            {visitedCities.length}/{cities.length} cities visited
          </Text>
        </View>
      </View>

      {/* City list */}
      <View style={styles.cityList}>
        <FlashList
          data={cities}
          renderItem={renderCity}
          estimatedItemSize={56}
          keyExtractor={(item) => item.city.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL1,
  },
  backButton: {
    position: 'absolute',
    top: spacing.xxl + spacing.md,
    left: spacing.md,
    zIndex: 10,
    borderRadius: borderRadius.full,
  },
  backPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  backArrow: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  backLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.xxxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  countryFlag: {
    fontSize: 48,
  },
  countryName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  citiesSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cityList: {
    flex: 1,
  },
  cityListItem: {
    opacity: 0,
    transform: [{ translateY: 8 }],
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.sm,
    minHeight: 56,
  },
  cityDot: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotUnvisited: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  cityInfo: {
    flex: 1,
    gap: 2,
  },
  cityName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  capitalTag: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.accentAmber,
  },
  cityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cityScore: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.accentAmber,
  },
})

export const CountryDrillDown = memo(CountryDrillDownInner)
