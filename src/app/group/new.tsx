/**
 * Create or join a group — dedicated full screen.
 */

import React, { useCallback, useState } from 'react'
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
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useGroupStore } from '@stores/groupStore'
import { useAuthStore } from '@stores/authStore'
import { createGroup, joinGroup, getUserGroups, getGroupMembers } from '@services/groups'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { sanitizeGroupName } from '@lib/sanitize'

type Tab = 'create' | 'join'

export default function NewGroupScreen() {
  const { user } = useAuthStore()
  const { addGroup, setGroups, setGroupMembers } = useGroupStore()

  const [tab, setTab] = useState<Tab>('create')
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/groups')
    }
  }, [])

  const switchTab = useCallback((t: Tab) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync()
    setTab(t)
    setError(null)
  }, [])

  const handleCreate = useCallback(async () => {
    if (!user) return
    const name = sanitizeGroupName(groupName)
    if (name.length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const newGroup = await createGroup(user.id, name)
      addGroup(newGroup)
      setCreatedCode(newGroup.invite_code ?? null)
      setCreatedName(name)
      setCreatedGroupId(newGroup.id)
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
    setLoading(true)
    setError(null)
    try {
      const member = await joinGroup(user.id, code)
      const updated = await getUserGroups(user.id)
      setGroups(updated)
      try {
        const members = await getGroupMembers(member.group_id)
        setGroupMembers(member.group_id, members)
      } catch {
        // non-fatal
      }
      router.replace(`/group/${member.group_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid or expired invite code.')
    } finally {
      setLoading(false)
    }
  }, [user, inviteCode, setGroups, setGroupMembers])

  const handleCopy = useCallback(async () => {
    if (!createdCode) return
    if (Platform.OS === 'web') {
      try {
        await (navigator as unknown as { clipboard: { writeText: (t: string) => Promise<void> } }).clipboard.writeText(createdCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // ignore
      }
    }
  }, [createdCode])

  const handleOpenGroup = useCallback(() => {
    if (createdGroupId) {
      router.replace(`/group/${createdGroupId}`)
    }
  }, [createdGroupId])

  // Success state after creation
  if (createdCode) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backText}>✕</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.center}
        >
          <ScrollView
            contentContainerStyle={styles.successContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.successTitle}>{createdName}</Text>
            <Text style={styles.successSubtitle}>Your group is ready. Share the invite code to add friends.</Text>

            <View style={styles.inviteBlock}>
              <Text style={styles.inviteLabel}>INVITE CODE</Text>
              <Pressable
                style={styles.codeCard}
                onPress={() => void handleCopy()}
                accessibilityRole="button"
                accessibilityLabel="Copy invite code"
              >
                <Text style={styles.codeText}>{createdCode.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.copyHint}>{copied ? '✓  Copied' : 'Tap to copy'}</Text>
              </Pressable>
              <Text style={styles.expiryNote}>Expires in 7 days · Up to 4 members</Text>
            </View>

            <View style={styles.successActions}>
              <Pressable
                style={styles.primaryBtn}
                onPress={handleOpenGroup}
                accessibilityRole="button"
                accessibilityLabel="Open group"
              >
                <Text style={styles.primaryBtnText}>Open Group</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>✕</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Group</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.center}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero area */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>👥</Text>
            <Text style={styles.heroTitle}>
              {tab === 'create' ? 'Create a group' : 'Join a group'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {tab === 'create'
                ? 'Travel together. Compare destinations with up to 3 friends.'
                : 'Enter an invite code from a friend to join their group.'}
            </Text>
          </View>

          {/* Tab toggle */}
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleOption, tab === 'create' && styles.toggleActive]}
              onPress={() => switchTab('create')}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'create' }}
              accessibilityLabel="Create tab"
            >
              <Text style={[styles.toggleLabel, tab === 'create' && styles.toggleLabelActive]}>
                Create
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleOption, tab === 'join' && styles.toggleActive]}
              onPress={() => switchTab('join')}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'join' }}
              accessibilityLabel="Join tab"
            >
              <Text style={[styles.toggleLabel, tab === 'join' && styles.toggleLabelActive]}>
                Join
              </Text>
            </Pressable>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {tab === 'create' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Group name</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Euro Trip 2025"
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
              </View>
            )}

            {tab === 'join' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Invite code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="Paste code here"
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
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={() => void (tab === 'create' ? handleCreate() : handleJoin())}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={tab === 'create' ? 'Create group' : 'Join group'}
            >
              {loading
                ? <ActivityIndicator color={colors.bgL0} size="small" />
                : <Text style={styles.primaryBtnText}>
                    {tab === 'create' ? 'Create Group' : 'Join Group'}
                  </Text>
              }
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const MAX_WIDTH = 480

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgL0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  screenTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  center: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  // Hero
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: MAX_WIDTH,
    width: '100%',
    paddingTop: spacing.lg,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.lg,
    padding: 4,
    maxWidth: MAX_WIDTH,
    width: '100%',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.smmd,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  toggleActive: {
    backgroundColor: colors.bgL3,
  },
  toggleLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  toggleLabelActive: {
    color: colors.textPrimary,
  },
  // Form card
  card: {
    backgroundColor: colors.bgL1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: MAX_WIDTH,
    width: '100%',
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.xl + spacing.md,
    height: 56,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    ...Platform.select({
      web: { outline: 'none' } as Record<string, unknown>,
      default: {},
    }),
  },
  codeInput: {
    fontFamily: fontFamily.mono,
    letterSpacing: 3,
    fontSize: fontSize.md,
    paddingRight: spacing.md,
  },
  charCount: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    lineHeight: 56,
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  errorText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  primaryBtn: {
    backgroundColor: colors.accentTeal,
    borderRadius: borderRadius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.bgL0,
  },
  // Success
  successContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    paddingTop: spacing.lg,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 36,
    color: colors.bgL0,
    fontFamily: fontFamily.semibold,
  },
  successActions: {
    width: '100%',
    maxWidth: MAX_WIDTH,
  },
  successTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -spacing.md,
  },
  inviteBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: MAX_WIDTH,
    width: '100%',
  },
  inviteLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  codeCard: {
    backgroundColor: colors.bgL1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.accentTeal,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  codeText: {
    fontFamily: fontFamily.mono,
    fontSize: 32,
    color: colors.accentTeal,
    letterSpacing: 6,
  },
  copyHint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  expiryNote: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
})
