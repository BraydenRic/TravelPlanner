/**
 * Groups screen — Group list with FAB to create/join.
 */

import React, { useCallback, useEffect } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { useAuthStore } from '@stores/authStore'
import { getUserGroups, getGroupMembers } from '@services/groups'
import { colors } from '@theme/colors'
import { spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import { GroupCard } from '@components/cards/GroupCard'
import { EmptyState } from '@components/layout/EmptyState'
import { useState } from 'react'

export default function GroupsScreen() {
  const { groups, groupMembers, setGroups, setGroupMembers } = useGroupStore()
  const { user } = useAuthStore()
  const [pageLoading, setPageLoading] = useState(true)

  // Load user's groups on mount
  useEffect(() => {
    if (!user) { setPageLoading(false); return }
    void getUserGroups(user.id)
      .then(async (loaded) => {
        setGroups(loaded)
        await Promise.all(
          loaded.map(async (g) => {
            try {
              const members = await getGroupMembers(g.id)
              setGroupMembers(g.id, members)
            } catch {
              // non-fatal
            }
          }),
        )
      })
      .catch(() => {})
      .finally(() => setPageLoading(false))
  }, [user, setGroups, setGroupMembers])

  const handleNew = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/group/new')
  }, [])

  const handleGroupPress = useCallback((groupId: string) => {
    router.push(`/group/${groupId}`)
  }, [])

  if (pageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentTeal} size="large" />
      </View>
    )
  }

  if (groups.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          type="groups"
          onActionPress={handleNew}
          actionLabel="Create a Group"
        />
        <View style={styles.fab} pointerEvents="box-none">
          <FabButton onPress={handleNew} />
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
        <FabButton onPress={handleNew} />
      </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgL0,
    alignItems: 'center',
    justifyContent: 'center',
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
})
