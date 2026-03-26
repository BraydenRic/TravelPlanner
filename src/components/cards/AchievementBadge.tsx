/**
 * AchievementBadge — Achievement in locked/unlocked states.
 * Unlocked: amber glow. Locked: grayscale 30% opacity + lock overlay.
 * Recently unlocked: spring pop-in.
 */

import React, { memo, useEffect } from 'react'
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import type { BadgeType } from '@typedefs/database'

interface AchievementBadgeProps {
  badgeType: BadgeType
  unlocked: boolean
  unlockedAt?: string
  style?: StyleProp<ViewStyle>
}

// Badge configurations with custom SVG icons
const BADGE_CONFIG: Record<
  BadgeType,
  { label: string; description: string; iconPath: string; color: string }
> = {
  first_stamp: {
    label: 'First Stamp',
    description: 'Mark your first country',
    iconPath: 'M12 2 L14 8 L20 8 L15 12 L17 18 L12 14 L7 18 L9 12 L4 8 L10 8 Z',
    color: colors.accentAmber,
  },
  continental: {
    label: 'Continental',
    description: 'Visit all continents',
    iconPath: 'M3 12 C3 7 7 3 12 3 C17 3 21 7 21 12 C21 17 17 21 12 21 C7 21 3 17 3 12 M8 12 C8 12 10 8 12 8 C14 8 16 12 16 12 C16 12 14 16 12 16 C10 16 8 12 8 12',
    color: colors.accentTeal,
  },
  globe_trotter: {
    label: 'Globe Trotter',
    description: 'Visit 50+ countries',
    iconPath: 'M12 2 C6.5 2 2 6.5 2 12 S6.5 22 12 22 S22 17.5 22 12 S17.5 2 12 2 M2 12 L22 12 M12 2 C12 2 8 6 8 12 S12 22 12 22 M12 2 C12 2 16 6 16 12 S12 22 12 22',
    color: colors.accentViolet,
  },
  critic: {
    label: 'Critic',
    description: 'Rate 10 places',
    iconPath: 'M12 2 L15 8.5 L22 9.5 L17 14 L18.5 21 L12 17.5 L5.5 21 L7 14 L2 9.5 L9 8.5 Z',
    color: colors.accentAmber,
  },
  squad_goals: {
    label: 'Squad Goals',
    description: 'Join a travel group',
    iconPath: 'M17 21 V19 C17 17.9 16.1 17 15 17 H9 C7.9 17 7 17.9 7 19 V21 M12 13 C14.2 13 16 11.2 16 9 C16 6.8 14.2 5 12 5 C9.8 5 8 6.8 8 9 C8 11.2 9.8 13 12 13 M20 8 C21.7 8.5 23 10 23 12 C23 14 21.7 15.5 20 16 M4 8 C2.3 8.5 1 10 1 12 C1 14 2.3 15.5 4 16',
    color: colors.accentCoral,
  },
  home_away: {
    label: 'Home Away',
    description: 'Mark a Lived place',
    iconPath: 'M3 9 L12 2 L21 9 V20 C21 20.6 20.6 21 20 21 H16 V15 H8 V21 H4 C3.4 21 3 20.6 3 20 V9 Z',
    color: colors.accentAmber,
  },
  city_explorer: {
    label: 'City Explorer',
    description: 'Visit 20+ cities',
    iconPath: 'M3 21 L3 9 L7 9 L7 4 L17 4 L17 9 L21 9 L21 21 M9 21 V15 H15 V21 M9 9 H11 M13 9 H15 M9 12 H11 M13 12 H15',
    color: colors.accentTeal,
  },
}

function AchievementBadgeInner({
  badgeType,
  unlocked,
  unlockedAt: _unlockedAt,
  style,
}: AchievementBadgeProps) {
  const config = BADGE_CONFIG[badgeType]
  const scale = useSharedValue(0.8)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withDelay(50, withSpring(1, unlocked ? springs.bouncy : springs.standard))
    opacity.value = withDelay(50, withSpring(1, springs.standard))
    return () => {
      scale.value = 0.8
      opacity.value = 0
    }
  }, [scale, opacity, unlocked])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const iconColor = unlocked ? config.color : colors.textTertiary
  const containerOpacity = unlocked ? 1 : 0.3

  return (
    <Animated.View style={[styles.container, style, animStyle]}>
      <View
        style={[
          styles.iconContainer,
          unlocked && {
            shadowColor: config.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 8,
          },
          { opacity: containerOpacity },
        ]}
      >
        <Svg width={32} height={32} viewBox="0 0 24 24">
          <Path
            d={config.iconPath}
            fill={unlocked ? iconColor : 'none'}
            stroke={iconColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={unlocked ? 0.9 : 0.4}
          />
        </Svg>

        {/* Lock overlay for locked state */}
        {!unlocked && (
          <View style={styles.lockOverlay}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Rect x="5" y="11" width="14" height="10" rx="2" fill={colors.bgL2} />
              <Path
                d="M8 11 V9 C8 7.3 9.3 6 11 6 H13 C14.7 6 16 7.3 16 9 V11"
                fill="none"
                stroke={colors.textTertiary}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Circle cx="12" cy="16" r="1.5" fill={colors.textTertiary} />
            </Svg>
          </View>
        )}
      </View>

      <Text style={[styles.label, !unlocked && styles.lockedLabel]} numberOfLines={1}>
        {config.label}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {config.description}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 90,
    gap: spacing.xs,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgL2,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.bgL1,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  lockedLabel: {
    color: colors.textTertiary,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 15,
  },
})

export const AchievementBadge = memo(AchievementBadgeInner)
