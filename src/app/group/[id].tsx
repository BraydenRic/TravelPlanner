/**
 * Group detail — combined map, member roster, invite code sharing.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useGroupStore } from '@stores/groupStore'
import { useAuthStore } from '@stores/authStore'
import { getGroup, getGroupMapData, leaveGroup, generateNewInviteCode } from '@services/groups'
import { getProfileById } from '@services/profiles'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { GlassPanel } from '@components/ui/GlassPanel'
import { WorldMap } from '@components/map/WorldMap'
import { sanitizeGroupName } from '@lib/sanitize'
import type { Profile } from '@typedefs/database'

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { groups, groupMembers, groupMapData, addGroup, setGroupMembers, setGroupMapData, removeGroup } = useGroupStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'map' | 'members'>('map')
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id])
  const members = groupMembers[id] ?? []
  const mapData = groupMapData[id] ?? []

  // Load group data on mount
  useEffect(() => {
    if (!id) return
    void (async () => {
      try {
        const { group: fetchedGroup, members: fetchedMembers } = await getGroup(id)
        // Cold-load case: store may not have this group (e.g. direct URL navigation).
        // Add it so the screen can read group name + creator status.
        if (!useGroupStore.getState().groups.some((g) => g.id === fetchedGroup.id)) {
          addGroup(fetchedGroup)
        }
        setGroupMembers(id, fetchedMembers)
        setInviteCode(fetchedGroup.invite_code ?? null)
        setInviteExpiry(fetchedGroup.invite_expires_at ?? null)

        // Load member profiles
        const profileMap: Record<string, Profile> = {}
        await Promise.all(
          fetchedMembers.map(async (m) => {
            try {
              const p = await getProfileById(m.user_id)
              if (p) profileMap[m.user_id] = p
            } catch {
              // non-fatal
            }
          }),
        )
        setProfiles(profileMap)

        // Load map data
        try {
          const mapEntries = await getGroupMapData(id)
          setGroupMapData(id, mapEntries)
        } catch {
          // non-fatal
        }
      } catch {
        // group not found or no access
      } finally {
        setLoading(false)
      }
    })()
  }, [id, addGroup, setGroupMembers, setGroupMapData])

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/groups')
    }
  }, [])

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return
    if (Platform.OS === 'web') {
      try {
        await (navigator as unknown as { clipboard: { writeText: (t: string) => Promise<void> } }).clipboard.writeText(inviteCode)
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      } catch {
        // ignore
      }
    }
  }, [inviteCode])

  const handleRegenerateCode = useCallback(async () => {
    if (!user || !id) return
    setRegenerating(true)
    try {
      const newCode = await generateNewInviteCode(user.id, id)
      setInviteCode(newCode)
      setInviteExpiry(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    } catch {
      // ignore
    } finally {
      setRegenerating(false)
    }
  }, [user, id])

  const handleLeave = useCallback(() => {
    if (!user || !id) return
    if (Platform.OS !== 'web') {
      Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => void doLeave(),
        },
      ])
    } else {
      void doLeave()
    }

    async function doLeave() {
      if (!user || !id) return
      setLeaving(true)
      try {
        await leaveGroup(user.id, id)
        removeGroup(id)
        router.back()
      } catch {
        setLeaving(false)
      }
    }
  }, [user, id, removeGroup])

  const groupName = group ? sanitizeGroupName(group.name) : 'Group'
  const isCreator = group?.created_by === user?.id

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentTeal} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <GlassPanel style={styles.backBtn}>
          <Pressable
            onPress={handleBack}
            style={styles.backPressable}
            accessibilityRole="button"
            accessibilityLabel="Back to groups"
          >
            <Text style={styles.backText}>← Groups</Text>
          </Pressable>
        </GlassPanel>
        <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
        <Pressable
          onPress={handleLeave}
          style={styles.leaveBtn}
          disabled={leaving}
          accessibilityRole="button"
          accessibilityLabel="Leave group"
        >
          <Text style={styles.leaveBtnText}>{leaving ? '…' : 'Leave'}</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['map', 'members'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync()
              setActiveTab(tab)
            }}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'map' ? 'Map' : 'Members'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'map' && (
        <View style={styles.mapContainer}>
          <WorldMap
            visitedCountries={[]}
            activeCategory="been"
            groupMapData={mapData}
            onCountryPress={() => {}}
          />
        </View>
      )}

      {activeTab === 'members' && (
        <ScrollView contentContainerStyle={styles.membersContent} showsVerticalScrollIndicator={false}>
          {/* Member roster */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members ({members.length}/4)</Text>
            {members.map((m) => {
              const profile = profiles[m.user_id]
              const displayName = profile?.display_name ?? m.user_id.slice(0, 8) + '…'
              const initial = displayName.charAt(0).toUpperCase()
              const isYou = m.user_id === user?.id
              return (
                <View key={m.id} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                    <Text style={styles.memberAvatarText}>{initial}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {displayName}{isYou ? ' (you)' : ''}
                    </Text>
                    {group?.created_by === m.user_id && (
                      <Text style={styles.memberRole}>Creator</Text>
                    )}
                  </View>
                  <View style={[styles.memberColorDot, { backgroundColor: m.color }]} />
                </View>
              )
            })}
          </View>

          {/* Invite section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite</Text>
            {inviteCode ? (
              <View style={styles.inviteCard}>
                <Pressable
                  style={styles.codeRow}
                  onPress={() => void handleCopyCode()}
                  accessibilityRole="button"
                  accessibilityLabel="Copy invite code"
                >
                  <Text style={styles.inviteCode}>{inviteCode.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.copyHint}>{copiedCode ? '✓ Copied' : 'Tap to copy'}</Text>
                </Pressable>
                {inviteExpiry && (
                  <Text style={styles.expiryText}>
                    Expires {new Date(inviteExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                )}
                {isCreator && (
                  <Pressable
                    style={styles.regenBtn}
                    onPress={() => void handleRegenerateCode()}
                    disabled={regenerating}
                    accessibilityRole="button"
                    accessibilityLabel="Generate new invite code"
                  >
                    <Text style={styles.regenBtnText}>
                      {regenerating ? 'Regenerating…' : 'Generate new code'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Text style={styles.noCodeText}>No active invite code.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    borderRadius: borderRadius.full,
  },
  backPressable: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  groupName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: -0.3,
  },
  leaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  leaveBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomColor: colors.accentTeal,
  },
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.accentTeal,
  },
  mapContainer: {
    flex: 1,
  },
  membersContent: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.bgL0,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  memberRole: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.accentTeal,
  },
  memberColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inviteCard: {
    backgroundColor: colors.bgL2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inviteCode: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    color: colors.accentTeal,
    letterSpacing: 3,
  },
  copyHint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  expiryText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  regenBtn: {
    paddingTop: spacing.xs,
  },
  regenBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noCodeText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
})
