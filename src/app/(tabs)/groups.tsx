/**
 * Groups screen — Group list, create/join modal.
 */

import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
  withTiming,
  useAnimatedStyle,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useGroupStore } from '@stores/groupStore'
import { useAuthStore } from '@stores/authStore'
import { createGroup, joinGroup, getUserGroups, getGroupMembers } from '@services/groups'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'
import { GroupCard } from '@components/cards/GroupCard'
import { EmptyState } from '@components/layout/EmptyState'
import { sanitizeGroupName } from '@lib/sanitize'

type SheetType = 'create' | 'join' | null

export default function GroupsScreen() {
  const { groups, groupMembers, setGroups, addGroup, setGroupMembers } = useGroupStore()
  const { user } = useAuthStore()
  const [activeSheet, setActiveSheet] = useState<SheetType>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const overlayOpacity = useSharedValue(0)
  const sheetY = useSharedValue(600)

  // Load user's groups on mount
  useEffect(() => {
    if (!user) return
    void getUserGroups(user.id)
      .then(async (loadedGroups) => {
        setGroups(loadedGroups)
        // Load members for each group
        await Promise.all(
          loadedGroups.map(async (g) => {
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

  const openSheet = useCallback((type: SheetType) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setActiveSheet(type)
    setError(null)
    setCreatedCode(null)
    overlayOpacity.value = withTiming(1, { duration: 200 })
    sheetY.value = withSpring(0, springs.standard)
  }, [overlayOpacity, sheetY])

  const closeSheet = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 200 })
    sheetY.value = withSpring(600, springs.standard)
    setTimeout(() => {
      setActiveSheet(null)
      setGroupName('')
      setInviteCode('')
      setError(null)
      setCreatedCode(null)
    }, 300)
  }, [overlayOpacity, sheetY])

  const handleCreate = useCallback(async () => {
    if (!user) return
    const name = sanitizeGroupName(groupName)
    if (name.length < 2) {
      setError('Group name must be at least 2 characters.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const newGroup = await createGroup(user.id, name)
      addGroup(newGroup)
      setCreatedCode(newGroup.invite_code ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create group.')
    } finally {
      setLoading(false)
    }
  }, [user, groupName, addGroup])

  const handleJoin = useCallback(async () => {
    if (!user) return
    const code = inviteCode.trim()
    if (code.length < 4) {
      setError('Enter a valid invite code.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const member = await joinGroup(user.id, code)
      // Load the full group
      const updated = await getUserGroups(user.id)
      setGroups(updated)
      // Load members for the new group
      try {
        const members = await getGroupMembers(member.group_id)
        setGroupMembers(member.group_id, members)
      } catch {
        // non-fatal
      }
      closeSheet()
      router.push(`/group/${member.group_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid invite code.')
    } finally {
      setLoading(false)
    }
  }, [user, inviteCode, setGroups, setGroupMembers, closeSheet])

  const handleGroupPress = useCallback((groupId: string) => {
    router.push(`/group/${groupId}`)
  }, [])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }))

  if (pageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentTeal} size="large" />
      </View>
    )
  }

  if (groups.length === 0 && !activeSheet) {
    return (
      <View style={styles.container}>
        <EmptyState
          type="groups"
          onActionPress={() => openSheet('create')}
          actionLabel="Create a Group"
        />
        <View style={styles.fab} pointerEvents="box-none">
          <FabButton onPress={() => openSheet('create')} />
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
        <FabButton onPress={() => openSheet('create')} />
      </View>

      {/* Sheet overlay */}
      {activeSheet && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Backdrop */}
          <Animated.View style={[styles.backdrop, overlayStyle]} pointerEvents="auto">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          {/* Sheet */}
          <KeyboardAvoidingView
            style={styles.sheetWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents="box-none"
          >
            <Animated.View style={[styles.sheet, sheetStyle]} entering={FadeIn} exiting={FadeOut}>
              {/* Handle */}
              <View style={styles.handleRow}>
                <View style={styles.handle} />
              </View>

              {/* Created success state */}
              {createdCode ? (
                <CreatedView
                  code={createdCode}
                  groupName={sanitizeGroupName(groupName)}
                  onDone={() => {
                    const g = groups[groups.length - 1]
                    closeSheet()
                    if (g) router.push(`/group/${g.id}`)
                  }}
                />
              ) : (
                <>
                  {/* Tab switcher */}
                  <View style={styles.tabRow}>
                    <Pressable
                      style={[styles.tab, activeSheet === 'create' && styles.tabActive]}
                      onPress={() => { setActiveSheet('create'); setError(null) }}
                    >
                      <Text style={[styles.tabLabel, activeSheet === 'create' && styles.tabLabelActive]}>
                        Create
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tab, activeSheet === 'join' && styles.tabActive]}
                      onPress={() => { setActiveSheet('join'); setError(null) }}
                    >
                      <Text style={[styles.tabLabel, activeSheet === 'join' && styles.tabLabelActive]}>
                        Join
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.sheetBody}>
                    {activeSheet === 'create' && (
                      <>
                        <Text style={styles.sheetSubtitle}>
                          Start a group and invite up to 3 friends.
                        </Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            placeholder="Group name"
                            placeholderTextColor={colors.textTertiary}
                            value={groupName}
                            onChangeText={(t) => { setGroupName(t.slice(0, 50)); setError(null) }}
                            maxLength={50}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={() => void handleCreate()}
                          />
                          <Text style={styles.charCount}>{groupName.length}/50</Text>
                        </View>
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        <Pressable
                          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                          onPress={() => void handleCreate()}
                          disabled={loading}
                        >
                          {loading
                            ? <ActivityIndicator color={colors.bgL0} size="small" />
                            : <Text style={styles.primaryBtnText}>Create Group</Text>
                          }
                        </Pressable>
                      </>
                    )}

                    {activeSheet === 'join' && (
                      <>
                        <Text style={styles.sheetSubtitle}>
                          Enter an invite code from a friend.
                        </Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={[styles.input, styles.codeInput]}
                            placeholder="Invite code"
                            placeholderTextColor={colors.textTertiary}
                            value={inviteCode}
                            onChangeText={(t) => { setInviteCode(t.toUpperCase()); setError(null) }}
                            maxLength={32}
                            autoCapitalize="characters"
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={() => void handleJoin()}
                          />
                        </View>
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        <Pressable
                          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                          onPress={() => void handleJoin()}
                          disabled={loading}
                        >
                          {loading
                            ? <ActivityIndicator color={colors.bgL0} size="small" />
                            : <Text style={styles.primaryBtnText}>Join Group</Text>
                          }
                        </Pressable>
                      </>
                    )}

                    <Pressable style={styles.cancelBtn} onPress={closeSheet}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  )
}

function CreatedView({
  code,
  groupName,
  onDone,
}: {
  code: string
  groupName: string
  onDone: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        await (navigator as unknown as { clipboard: { writeText: (t: string) => Promise<void> } }).clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // ignore
      }
    }
  }, [code])

  return (
    <View style={styles.createdView}>
      <Text style={styles.createdEmoji}>🎉</Text>
      <Text style={styles.createdTitle}>{groupName} created!</Text>
      <Text style={styles.createdSubtitle}>Share this invite code with friends:</Text>
      <Pressable style={styles.codeCard} onPress={() => void handleCopy()}>
        <Text style={styles.codeText}>{code.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.copyHint}>{copied ? 'Copied!' : 'Tap to copy'}</Text>
      </Pressable>
      <Text style={styles.expiryNote}>Code expires in 7 days</Text>
      <Pressable style={styles.primaryBtn} onPress={onDone}>
        <Text style={styles.primaryBtnText}>Open Group</Text>
      </Pressable>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 40,
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  sheet: {
    backgroundColor: colors.bgL1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.glassBorder,
    paddingBottom: spacing.xxl,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      } as Record<string, string>,
      default: {},
    }),
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgL3,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.bgL3,
  },
  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  sheetBody: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sheetSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.xl + spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    height: 52,
    ...Platform.select({
      web: { outline: 'none' } as Record<string, unknown>,
      default: {},
    }),
  },
  codeInput: {
    fontFamily: fontFamily.mono,
    letterSpacing: 2,
    fontSize: fontSize.md,
  },
  charCount: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    lineHeight: 52,
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  errorText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: -spacing.xs,
  },
  primaryBtn: {
    backgroundColor: colors.accentTeal,
    borderRadius: borderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.bgL0,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  // Created success view
  createdView: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  createdEmoji: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  createdTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  createdSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  codeCard: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accentTeal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'stretch',
  },
  codeText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['2xl'],
    color: colors.accentTeal,
    letterSpacing: 4,
  },
  copyHint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  expiryNote: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
})
