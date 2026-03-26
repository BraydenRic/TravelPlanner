/**
 * GroupCard — Group summary card with member avatar stack.
 */

import React, { memo, useCallback } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import type { Group, GroupMember } from '@typedefs/database'
import { sanitizeGroupName } from '@lib/sanitize'

interface GroupCardProps {
  group: Group
  members: GroupMember[]
  onPress: () => void
}

const MEMBER_AVATAR_SIZE = 32
const MEMBER_OVERLAP = 10

function GroupCardInner({ group, members, onPress }: GroupCardProps) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, springs.snappy)
  }, [scale])

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springs.standard)
  }, [scale])

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }, [onPress])

  const groupName = sanitizeGroupName(group.name)
  const avatarWidth = MEMBER_AVATAR_SIZE + (members.length - 1) * (MEMBER_AVATAR_SIZE - MEMBER_OVERLAP)

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${groupName} group`}
      >
        <View style={styles.header}>
          {/* Member avatar stack */}
          <View style={[styles.avatarStack, { width: Math.max(avatarWidth, MEMBER_AVATAR_SIZE) }]}>
            {members.map((member, i) => (
              <View
                key={member.id}
                style={[
                  styles.avatar,
                  {
                    backgroundColor: member.color,
                    left: i * (MEMBER_AVATAR_SIZE - MEMBER_OVERLAP),
                    zIndex: members.length - i,
                  },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {/* Display index as letter placeholder */}
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.meta}>
            <Text style={styles.groupName} numberOfLines={1}>
              {groupName}
            </Text>
            <Text style={styles.memberCount}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Created date */}
        <Text style={styles.created}>
          Created {formatDate(group.created_at)}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarStack: {
    height: MEMBER_AVATAR_SIZE,
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    position: 'absolute',
    width: MEMBER_AVATAR_SIZE,
    height: MEMBER_AVATAR_SIZE,
    borderRadius: MEMBER_AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgL2,
  },
  avatarInitial: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.bgL0,
  },
  meta: {
    flex: 1,
  },
  groupName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  memberCount: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  created: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
})

export const GroupCard = memo(GroupCardInner)
