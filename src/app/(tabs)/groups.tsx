/**
 * Groups screen — Group list, create/join FAB.
 */

import React, { useCallback, useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useGroupStore } from '@stores/groupStore'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import { GroupCard } from '@components/cards/GroupCard'
import { EmptyState } from '@components/layout/EmptyState'
import { SpringButton } from '@components/ui/SpringButton'
import { sanitizeGroupName } from '@lib/sanitize'

type SheetType = 'create' | 'join' | null

export default function GroupsScreen() {
  const { groups, groupMembers } = useGroupStore()
  const [activeSheet, setActiveSheet] = useState<SheetType>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const sheetY = useSharedValue(400)

  const openSheet = useCallback((type: SheetType) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setActiveSheet(type)
    sheetY.value = withSpring(0, springs.standard)
  }, [sheetY])

  const closeSheet = useCallback(() => {
    sheetY.value = withSpring(400, springs.standard)
    setTimeout(() => {
      setActiveSheet(null)
      setGroupName('')
      setInviteCode('')
    }, 300)
  }, [sheetY])

  const handleFabPress = useCallback(() => {
    openSheet('create')
  }, [openSheet])

  const handleGroupPress = useCallback((groupId: string) => {
    router.push(`/group/${groupId}`)
  }, [])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }))

  if (groups.length === 0 && !activeSheet) {
    return (
      <View style={styles.container}>
        <EmptyState
          type="groups"
          onActionPress={() => openSheet('create')}
          actionLabel="Create a Group"
        />
        <View style={styles.fab}>
          <FabButton onPress={handleFabPress} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
      </View>

      {/* Group list */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            members={groupMembers[group.id] ?? []}
            onPress={() => handleGroupPress(group.id)}
          />
        ))}
        <View style={{ height: spacing.xxl + spacing.xxxl }} />
      </ScrollView>

      {/* FAB */}
      <View style={styles.fab} pointerEvents="box-none">
        <FabButton onPress={handleFabPress} />
      </View>

      {/* Bottom sheets */}
      {activeSheet && (
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {activeSheet === 'create' ? 'Create Group' : 'Join Group'}
            </Text>

            {activeSheet === 'create' && (
              <>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="Group name"
                  placeholderTextColor={colors.textTertiary}
                  value={groupName}
                  onChangeText={(t) => setGroupName(t.slice(0, 50))}
                  maxLength={50}
                  autoFocus
                />
                <SpringButton
                  variant="primary"
                  onPress={() => {
                    const name = sanitizeGroupName(groupName)
                    if (name.length >= 2) closeSheet()
                  }}
                >
                  Create
                </SpringButton>
                <Pressable onPress={() => { setActiveSheet('join') }} style={styles.switchLink}>
                  <Text style={styles.switchText}>Join an existing group instead →</Text>
                </Pressable>
              </>
            )}

            {activeSheet === 'join' && (
              <>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="Invite code"
                  placeholderTextColor={colors.textTertiary}
                  value={inviteCode}
                  onChangeText={(t) => setInviteCode(t.toUpperCase())}
                  maxLength={12}
                  autoCapitalize="characters"
                  autoFocus
                />
                <SpringButton
                  variant="primary"
                  onPress={() => {
                    if (inviteCode.length >= 4) closeSheet()
                  }}
                >
                  Join
                </SpringButton>
              </>
            )}
            <View style={{ height: 40 }} />
          </Animated.View>
        </View>
      )}
    </View>
  )
}

function FabButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.9, springs.snappy, () => {
            scale.value = withSpring(1, springs.standard)
          })
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          onPress()
        }}
        style={styles.fabButton}
        accessibilityRole="button"
        accessibilityLabel="Create or join group"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl + spacing.xxxl,
    right: spacing.lg,
    zIndex: 20,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.bgL0,
    lineHeight: 28,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  sheet: {
    backgroundColor: colors.bgL1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgL3,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
  },
  sheetInput: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    height: 52,
  },
  switchLink: {
    alignSelf: 'center',
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  switchText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
})
