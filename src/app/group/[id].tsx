/**
 * Group detail — combined map, member roster, invite code sharing.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  getGroup,
  getGroupMapData,
  leaveGroup,
  generateNewInviteCode,
  toggleGroupCountry,
} from '@services/groups'
import { getProfileById } from '@services/profiles'
import { subscribeToGroup } from '@lib/realtime'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { GlassPanel } from '@components/ui/GlassPanel'
import { WorldMap } from '@components/map/WorldMap'
import { sanitizeGroupName } from '@lib/sanitize'
import type { MemberColor, Profile } from '@typedefs/database'
import type { GroupMemberPlace } from '@typedefs/api'

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { groups, groupMembers, groupMapData, addGroup, setGroupMembers, setGroupMapData, removeGroup } = useGroupStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'map' | 'members'>('map')
  const [showLabels, setShowLabels] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // Country-toggle write tracking — see handleCountryPress for why these exist.
  const pendingWrites = useRef(0)
  const writeQueue = useRef<Promise<void>>(Promise.resolve())

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id])
  const members = useMemo(() => groupMembers[id] ?? [], [groupMembers, id])
  const mapData = groupMapData[id] ?? []

  // Refetch helpers — used by initial load AND realtime push events.
  const refetchMembers = useCallback(async () => {
    if (!id) return
    try {
      const { group: fetchedGroup, members: fetchedMembers } = await getGroup(id)
      if (!useGroupStore.getState().groups.some((g) => g.id === fetchedGroup.id)) {
        addGroup(fetchedGroup)
      }
      setGroupMembers(id, fetchedMembers)
      setInviteCode(fetchedGroup.invite_code ?? null)
      setInviteExpiry(fetchedGroup.invite_expires_at ?? null)

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
    } catch {
      // group not found or no access
    }
  }, [id, addGroup, setGroupMembers])

  const mapFetchSeq = useRef(0)
  const refetchMap = useCallback(async () => {
    if (!id) return
    const seq = ++mapFetchSeq.current
    try {
      const mapEntries = await getGroupMapData(id)
      // Discard stale snapshots: if a write started while this request was
      // in flight (rapid taps), the optimistic state is newer than this
      // response and applying it would flick the country to the wrong state
      // for a moment — the queue refetches again when it drains. Same for a
      // newer refetch overtaking this one.
      if (pendingWrites.current > 0 || seq !== mapFetchSeq.current) return
      setGroupMapData(id, mapEntries)
    } catch {
      // non-fatal
    }
  }, [id, setGroupMapData])

  // Load group data on mount
  useEffect(() => {
    if (!id) return
    void (async () => {
      await refetchMembers()
      await refetchMap()
      setLoading(false)
    })()
  }, [id, refetchMembers, refetchMap])

  // Subscribe to realtime updates while this screen is mounted.
  // Member joins, leaves, and code regenerations push live; place adds refresh the map.
  useEffect(() => {
    if (!id) return
    const unsubscribe = subscribeToGroup(id, {
      onMemberChanged: () => void refetchMembers(),
      // Skip refetch while our own writes are in flight — the event may be the
      // echo of our optimistic toggle, and refetching mid-write would briefly
      // revert the map. The queue does its own reconciling refetch on drain.
      onPlaceAdded: () => {
        if (pendingWrites.current === 0) void refetchMap()
      },
    })
    return unsubscribe
  }, [id, refetchMembers, refetchMap])

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/groups')
    }
  }, [])

  // Tapping a country toggles the current user's "want to go" mark for the
  // group trip. This writes to group_places (completely separate from the
  // user's personal visited_places), so the group map only shows trip plans
  // that members explicitly added here.
  //
  // The store is updated optimistically so the country lights up on the very
  // frame of the tap; the DB write happens behind the scenes. Writes are
  // serialized through a queue because toggleGroupCountry does a
  // lookup-then-write — two concurrent toggles of the same country would both
  // see the same state and double-insert. Once the queue drains, one silent
  // refetch reconciles the map with server truth (and rolls back on failure).
  const handleCountryPress = useCallback(
    (countryCode: string) => {
      if (!user || !id) return
      if (Platform.OS !== 'web') void Haptics.selectionAsync()

      const code = countryCode.toUpperCase()
      const current = useGroupStore.getState().groupMapData[id] ?? []
      const isMine = (p: GroupMemberPlace) =>
        p.user_id === user.id && p.country_code === code && p.category === 'want_to_go'

      if (current.some(isMine)) {
        setGroupMapData(id, current.filter((p) => !isMine(p)))
      } else {
        const color: MemberColor =
          members.find((m) => m.user_id === user.id)?.color ?? '#00F5D4'
        setGroupMapData(id, [
          ...current,
          { user_id: user.id, color, country_code: code, city_id: null, category: 'want_to_go' },
        ])
      }

      pendingWrites.current += 1
      writeQueue.current = writeQueue.current
        .then(() => toggleGroupCountry(user.id, id, code))
        .then(
          () => undefined,
          () => undefined, // failure is reconciled by the refetch below
        )
        .finally(() => {
          pendingWrites.current -= 1
          if (pendingWrites.current === 0) void refetchMap()
        })
    },
    [user, id, members, setGroupMapData, refetchMap],
  )

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
          {/* Header row above the map — hint on the left, labels toggle on the
              right. Inline (not absolute) so it's always visible regardless of
              what the map's SVG renders. */}
          <View style={styles.mapHeader}>
            <Text style={styles.mapHint} numberOfLines={2}>
              Tap a country to mark it. Each member&apos;s color appears.
            </Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync()
                setShowLabels((v) => !v)
              }}
              style={[styles.labelsToggle, showLabels && styles.labelsToggleActive]}
              accessibilityRole="switch"
              accessibilityState={{ checked: showLabels }}
              accessibilityLabel="Toggle country name labels"
            >
              <View
                style={[styles.toggleDot, showLabels && styles.toggleDotActive]}
              />
              <Text
                style={[styles.labelsToggleText, showLabels && styles.labelsToggleTextActive]}
              >
                {showLabels ? 'Labels on' : 'Labels off'}
              </Text>
            </Pressable>
          </View>
          <WorldMap
            visitedCountries={[]}
            activeCategory="been"
            groupMapData={mapData}
            onCountryPress={handleCountryPress}
            showAllLabels={showLabels}
          />
          {/* Member color legend so users can read the map */}
          {members.length > 0 && (
            <View style={styles.mapLegend}>
              {members.map((m) => {
                const profile = profiles[m.user_id]
                const name = profile?.display_name ?? 'Member'
                return (
                  <View key={m.id} style={styles.legendChip}>
                    <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>{name}</Text>
                  </View>
                )
              })}
            </View>
          )}
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
    borderBottomColor: colors.transparent,
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
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  mapHint: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  labelsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgL2,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  labelsToggleActive: {
    borderColor: colors.accentTeal,
    backgroundColor: colors.tealAlpha15,
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
  },
  toggleDotActive: {
    backgroundColor: colors.accentTeal,
  },
  labelsToggleText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  labelsToggleTextActive: {
    color: colors.accentTeal,
  },
  mapLegend: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.darkOverlay85,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    maxWidth: 80,
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
